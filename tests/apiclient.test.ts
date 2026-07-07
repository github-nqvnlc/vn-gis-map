import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient, ApiClientError } from '../src/core/ApiClient';
import type { VNGeoJSONCollection } from '../src/types/api.types';

const sampleCollection: VNGeoJSONCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [106, 16] },
      properties: { code: '01', name: 'Hà Nội' },
    },
  ],
};

const sampleLoginResponse = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  expiresIn: '7d',
  user: { id: 1, email: 'user@example.com', role: 'USER' },
};

const sampleMeResponse = {
  id: 42,
  email: 'user@example.com',
  role: 'USER',
  name: 'Test User',
  createdAt: '2026-01-01T00:00:00Z',
};

function mockJsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
  } as unknown as Response;
}

function mockJsonClient() {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('ApiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = mockJsonClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches provinces as raw GeoJSON (no envelope)', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(sampleCollection));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    const result = await client.getProvinces();
    expect(result).toEqual(sampleCollection);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/gis/provinces');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer tok',
      Accept: 'application/json',
    });
  });

  it('caches province results so second call skips fetch', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(sampleCollection));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await client.getProvinces();
    await client.getProvinces();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('passes provinceCode as query param for wards', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(sampleCollection));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await client.getWards('01');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/gis/wards?provinceCode=01');
  });

  it('caches wards per provinceCode independently', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse(sampleCollection));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await client.getWards('01');
    await client.getWards('02');
    await client.getWards('01');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reverseGeocode builds lng/lat query', async () => {
    const lookup = { found: true, point: { lng: 106, lat: 16 } };
    fetchMock.mockResolvedValueOnce(mockJsonResponse(lookup));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    const result = await client.reverseGeocode(106, 16);
    expect(result).toEqual(lookup);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/gis/lookup?lng=106&lat=16');
  });

  it('reverseGeocode caches identical coords', async () => {
    const lookup = { found: true, point: { lng: 106, lat: 16 } };
    fetchMock.mockResolvedValue(mockJsonResponse(lookup));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await client.reverseGeocode(106, 16);
    await client.reverseGeocode(106, 16);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws ApiClientError on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ message: 'Unauthorized' }, false, 401));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'bad' });
    await expect(client.getProvinces()).rejects.toBeInstanceOf(ApiClientError);
  });

  it('joins array error messages', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ message: ['a', 'b'] }, false, 400));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await expect(client.getProvinces()).rejects.toThrow('a, b');
  });

  it('falls back to status text when error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => {
        throw new Error('bad json');
      },
    } as unknown as Response);
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await expect(client.getProvinces()).rejects.toThrow('API error 500');
  });

  it('fetchGeoJSON validates FeatureCollection type', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ type: 'NotACollection' }));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await expect(client.fetchGeoJSON('https://cdn.example.com/x.json')).rejects.toBeInstanceOf(
      ApiClientError,
    );
  });

  it('fetchGeoJSON throws on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({}, false, 404));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await expect(client.fetchGeoJSON('https://cdn.example.com/x.json')).rejects.toThrow(
      /Failed to fetch GeoJSON/,
    );
  });

  it('clearCache forces a refetch', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse(sampleCollection));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await client.getProvinces();
    client.clearCache();
    await client.getProvinces();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('setToken invalidates cache', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse(sampleCollection));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok1' });
    await client.getProvinces();
    client.setToken('tok2');
    await client.getProvinces();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = fetchMock.mock.calls[1];
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok2' });
  });

  it('builds absolute URL when baseUrl has no trailing slash', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(sampleCollection));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await client.getProvinces();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/gis/provinces');
  });

  it('strips trailing slash from baseUrl', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(sampleCollection));
    const client = new ApiClient({ baseUrl: 'https://api.example.com/', token: 'tok' });
    await client.getProvinces();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/gis/provinces');
  });
});

describe('ApiClient response format', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = mockJsonClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns data field when format=envelope', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: sampleCollection }));
    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      token: 'tok',
      responseFormat: 'envelope',
    });
    const result = await client.getProvinces();
    expect(result).toEqual(sampleCollection);
  });

  it('auto-detects raw GeoJSON response', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(sampleCollection));
    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      token: 'tok',
      responseFormat: 'auto',
    });
    const result = await client.getProvinces();
    expect(result).toEqual(sampleCollection);
  });

  it('auto-detects envelope response and unwraps .data', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ data: sampleCollection }));
    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      token: 'tok',
      responseFormat: 'auto',
    });
    const result = await client.getProvinces();
    expect(result).toEqual(sampleCollection);
  });

  it('auto returns lookup as-is when shape matches', async () => {
    const lookup = { found: true, point: { lng: 106, lat: 16 } };
    fetchMock.mockResolvedValueOnce(mockJsonResponse(lookup));
    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      token: 'tok',
      responseFormat: 'auto',
    });
    const result = await client.reverseGeocode(106, 16);
    expect(result).toEqual(lookup);
  });
});

describe('ApiClient.validate()', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = mockJsonClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns valid=true with user info on 200 OK', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(sampleMeResponse));
    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      token: 'valid-token',
    });
    const result = await client.validate();
    expect(result.valid).toBe(true);
    expect(result.user).toEqual({ id: 42, email: 'user@example.com', role: 'USER' });
    expect(result.reason).toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/auth/me');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer valid-token',
    });
  });

  it('returns valid=false with reason on 401 Unauthorized', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ message: 'Unauthorized' }, false, 401));
    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      token: 'bad-token',
    });
    const result = await client.validate();
    expect(result.valid).toBe(false);
    expect(result.user).toBeUndefined();
    expect(result.reason).toMatch(/không hợp lệ|hết hạn|Invalid/);
  });

  it('returns valid=false with HTTP status message on other non-ok codes', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ message: 'Forbidden' }, false, 403));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    const result = await client.validate();
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Forbidden');
  });

  it('returns valid=false with connection error message on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    const result = await client.validate();
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Không thể kết nối/);
  });

  it('accepts baseUrlOverride and tokenOverride', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ id: 1, email: 'a@b.com', role: 'ADMIN' }));
    const client = new ApiClient({
      baseUrl: 'https://old.example.com',
      token: 'old-token',
    });
    const result = await client.validate('https://new.example.com', 'new-token');
    expect(result.valid).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://new.example.com/v1/auth/me');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer new-token',
    });
  });

  it('strips trailing slash from baseUrlOverride', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ id: 1, email: 'a@b.com', role: 'USER' }));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await client.validate('https://new.example.com/');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://new.example.com/v1/auth/me');
  });

  it('extracts user even when response contains extra fields', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ id: 5, email: 'extra@field.com', role: 'ADMIN', extra: 'ignored' }),
    );
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    const result = await client.validate();
    expect(result.valid).toBe(true);
    expect(result.user).toEqual({ id: 5, email: 'extra@field.com', role: 'ADMIN' });
  });

  it('does NOT throw on any error — always returns ValidateResult', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ message: 'Server Error' }, false, 500));
    const client = new ApiClient({ baseUrl: 'https://api.example.com', token: 'tok' });
    await expect(client.validate()).resolves.toMatchObject({ valid: false });
  });

  it('returns valid=false with no-token message when token is empty', async () => {
    const client = new ApiClient({ baseUrl: 'https://api.example.com' });
    const result = await client.validate();
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Chưa có token/);
  });
});

describe('ApiClient.login()', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = mockJsonClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns LoginResult on 200 OK', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(sampleLoginResponse));
    const client = new ApiClient({ baseUrl: 'https://api.example.com' });
    const result = await client.login();
    expect(result.accessToken).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
    expect(result.user).toEqual({ id: 1, email: 'user@example.com', role: 'USER' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/auth/login');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ email: '', password: '' });
  });

  it('sends usernameOverride and passwordOverride', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(sampleLoginResponse));
    const client = new ApiClient({ baseUrl: 'https://api.example.com' });
    await client.login('https://custom.example.com', 'user@test.com', 'secret123');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://custom.example.com/v1/auth/login');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ email: 'user@test.com', password: 'secret123' });
  });

  it('throws ApiClientError on 401 Unauthorized', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ message: 'Invalid email or password' }, false, 401),
    );
    const client = new ApiClient({ baseUrl: 'https://api.example.com' });
    await expect(client.login()).rejects.toBeInstanceOf(ApiClientError);
  });

  it('joins array error message on failure', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ message: ['err1', 'err2'] }, false, 400));
    const client = new ApiClient({ baseUrl: 'https://api.example.com' });
    await expect(client.login()).rejects.toThrow('err1, err2');
  });

  it('throws ApiClientError on unexpected response shape', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ not: 'a login response' }));
    const client = new ApiClient({ baseUrl: 'https://api.example.com' });
    await expect(client.login()).rejects.toBeInstanceOf(ApiClientError);
  });

  it('throws ApiClientError on non-ok non-401 status', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({ message: 'Server Error' }, false, 500));
    const client = new ApiClient({ baseUrl: 'https://api.example.com' });
    await expect(client.login()).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe('ApiClient auto-login (username + password)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = mockJsonClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('auto-login on first API call when token is missing', async () => {
    // First call → login, second call → actual request
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse(sampleLoginResponse))
      .mockResolvedValueOnce(mockJsonResponse(sampleCollection));

    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      username: 'user@test.com',
      password: 'secret',
    });

    const result = await client.getProvinces();
    expect(result).toEqual(sampleCollection);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 1st: login
    const [loginUrl, loginInit] = fetchMock.mock.calls[0];
    expect(loginUrl).toBe('https://api.example.com/v1/auth/login');
    const loginBody = JSON.parse((loginInit as RequestInit).body as string);
    expect(loginBody).toEqual({ email: 'user@test.com', password: 'secret' });

    // 2nd: provinces
    const [, provincesInit] = fetchMock.mock.calls[1];
    expect((provincesInit as RequestInit).headers).toMatchObject({
      Authorization: `Bearer ${sampleLoginResponse.accessToken}`,
    });
  });

  it('uses pre-existing token without calling login', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse(sampleCollection));

    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      token: 'pre-existing-token',
      username: 'user@test.com',
      password: 'secret',
    });

    await client.getProvinces();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/gis/provinces');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer pre-existing-token',
    });
  });

  it('caches token after first auto-login — subsequent calls skip login', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse(sampleLoginResponse))
      .mockResolvedValueOnce(mockJsonResponse(sampleCollection))
      .mockResolvedValueOnce(mockJsonResponse({ found: true, point: { lng: 106, lat: 16 } }));

    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      username: 'user@test.com',
      password: 'secret',
    });

    await client.getProvinces();
    await client.reverseGeocode(106, 16);
    await client.getProvinces();

    // Only 1 login call (first), rest are actual API calls
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const loginCalls = fetchMock.mock.calls.filter(([u]) =>
      (u as string).includes('/v1/auth/login'),
    );
    expect(loginCalls).toHaveLength(1);
  });

  it('throws when auto-login fails', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({ message: 'Invalid credentials' }, false, 401),
    );

    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      username: 'user@test.com',
      password: 'wrong',
    });

    await expect(client.getProvinces()).rejects.toMatchObject({ statusCode: 401 });
  });

  it('setToken + clearCache then call → no re-login if token set explicitly', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse(sampleLoginResponse))
      .mockResolvedValueOnce(mockJsonResponse(sampleCollection))
      .mockResolvedValueOnce(mockJsonResponse(sampleCollection));

    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      username: 'user@test.com',
      password: 'secret',
    });

    await client.getProvinces(); // auto-login + provinces
    client.setToken('fresh-token');
    client.clearCache();
    await client.getProvinces(); // uses fresh-token, no login

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('validate without token or credentials returns no-token reason', async () => {
    const client = new ApiClient({
      baseUrl: 'https://api.example.com',
      username: 'user@test.com',
      password: 'secret',
    });
    const result = await client.validate();
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Chưa có token/);
  });
});
