const baseUrl = 'http://127.0.0.1:4000';

const results = [];

const request = async (method, path, body, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (err) { json = { raw: text }; }
  return { status: res.status, body: json };
};

const addResult = (test, role, endpoint, expected, actual, status) => {
  results.push({ test, role, endpoint, expected, actual, status });
};

const run = async () => {
  let adminToken = null;
  let pemilikToken = null;
  let produksiToken = null;

  const loginTests = [
    { username: 'admin', password: 'admin123', roleLabel: 'Admin', expectedRole: 'ADMIN' },
    { username: 'pemilik', password: 'pemilik123', roleLabel: 'Pemilik', expectedRole: 'PEMILIK' },
    { username: 'produksi', password: 'produksi123', roleLabel: 'Pengelola Produksi', expectedRole: 'PENGELOLA_PRODUKSI' }
  ];

  for (const test of loginTests) {
    const response = await request('POST', '/api/auth/login', { username: test.username, password: test.password });
    const ok = response.status === 200 && response.body?.success === true && response.body?.data?.token && response.body?.data?.role === test.expectedRole && response.body?.data?.user?.password === undefined;
    const actual = {
      status: response.status,
      success: response.body?.success,
      tokenPresent: Boolean(response.body?.data?.token),
      role: response.body?.data?.role,
      passwordReturned: response.body?.data?.user?.password
    };
    addResult(`POST /api/auth/login (${test.username})`, test.roleLabel, '/api/auth/login', `200 + token + role=${test.expectedRole} + no password`, JSON.stringify(actual), ok ? 'PASS' : 'FAIL');
    if (ok) {
      if (test.username === 'admin') adminToken = response.body.data.token;
      if (test.username === 'pemilik') pemilikToken = response.body.data.token;
      if (test.username === 'produksi') produksiToken = response.body.data.token;
    }
  }

  const invalidResponse = await request('POST', '/api/auth/login', { username: 'admin', password: 'wrongpassword' });
  addResult('POST /api/auth/login (invalid credentials)', 'None', '/api/auth/login', '401 + message "Username atau password tidak valid."', JSON.stringify({ status: invalidResponse.status, body: invalidResponse.body }), invalidResponse.status === 401 && invalidResponse.body?.message === 'Username atau password tidak valid.' ? 'PASS' : 'FAIL');

  const noTokenResponse = await request('GET', '/api/pelanggan');
  addResult('GET /api/pelanggan without token', 'None', '/api/pelanggan', '401 + token missing', JSON.stringify({ status: noTokenResponse.status, body: noTokenResponse.body }), noTokenResponse.status === 401 && noTokenResponse.body?.message === 'Token tidak ditemukan' ? 'PASS' : 'FAIL');

  const allTokens = [
    { token: adminToken, role: 'Admin' },
    { token: pemilikToken, role: 'Pemilik' },
    { token: produksiToken, role: 'Pengelola Produksi' }
  ];

  if (!adminToken || !pemilikToken || !produksiToken) {
    console.error('Login failed for one or more users, aborting RBAC tests.');
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  // Admin rights
  const adminAllowed = [
    { method: 'GET', path: '/api/pelanggan', expected: 'allow' },
    { method: 'GET', path: '/api/pesanan', expected: 'allow' }
  ];
  const adminDenied = [
    { method: 'GET', path: '/api/prioritas', expected: 'deny' },
    { method: 'GET', path: '/api/produksi', expected: 'deny' }
  ];

  for (const endpoint of adminAllowed) {
    const response = await request(endpoint.method, endpoint.path, null, adminToken);
    const actualStatus = response.status;
    const ok = actualStatus >= 200 && actualStatus < 300 && (response.body?.success === true || endpoint.path === '/api/produksi');
    addResult(`RBAC Admin allow ${endpoint.path}`, 'Admin', endpoint.path, 'allow', JSON.stringify({ status: response.status, body: response.body }), ok ? 'PASS' : 'FAIL');
  }

  for (const endpoint of adminDenied) {
    const response = await request(endpoint.method, endpoint.path, null, adminToken);
    const shouldFail = response.status === 403;
    addResult(`RBAC Admin deny ${endpoint.path}`, 'Admin', endpoint.path, 'deny', JSON.stringify({ status: response.status, body: response.body }), shouldFail ? 'PASS' : 'FAIL');
  }

  // Pemilik rights
  const pemilikTests = [
    { method: 'GET', path: '/api/pesanan', expected: 'allow' },
    { method: 'GET', path: '/api/prioritas', expected: 'allow' },
    { method: 'POST', path: '/api/prioritas/jalankan', expected: 'allow' },
    { method: 'GET', path: '/api/laporan', expected: 'allow' }
  ];

  for (const endpoint of pemilikTests) {
    const response = await request(endpoint.method, endpoint.path, null, pemilikToken);
    const allowed = response.status >= 200 && response.status < 300;
    addResult(`RBAC Pemilik ${endpoint.path}`, 'Pemilik', endpoint.path, endpoint.expected, JSON.stringify({ status: response.status, body: response.body }), allowed ? 'PASS' : 'FAIL');
  }

  // Pengelola Produksi rights
  const produksiTests = [
    { method: 'GET', path: '/api/prioritas', expected: 'allow' },
    { method: 'GET', path: '/api/produksi', expected: 'allow' }
  ];

  for (const endpoint of produksiTests) {
    const response = await request(endpoint.method, endpoint.path, null, produksiToken);
    const allowed = response.status >= 200 && response.status < 300;
    addResult(`RBAC Produksi ${endpoint.path}`, 'Pengelola Produksi', endpoint.path, endpoint.expected, JSON.stringify({ status: response.status, body: response.body }), allowed ? 'PASS' : 'FAIL');
  }

  const produksiDenied = [
    { method: 'GET', path: '/api/pelanggan', expected: 'deny' },
    { method: 'GET', path: '/api/pesanan', expected: 'deny' },
    { method: 'POST', path: '/api/prioritas/jalankan', expected: 'deny' }
  ];

  for (const endpoint of produksiDenied) {
    const response = await request(endpoint.method, endpoint.path, null, produksiToken);
    const denied = response.status === 403;
    addResult(`RBAC Produksi deny ${endpoint.path}`, 'Pengelola Produksi', endpoint.path, endpoint.expected, JSON.stringify({ status: response.status, body: response.body }), denied ? 'PASS' : 'FAIL');
  }

  console.log(JSON.stringify(results, null, 2));
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
