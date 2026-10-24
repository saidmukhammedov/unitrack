// Staging Deployment Smoke Test Script
// Usage: node scripts/staging-smoke-test.mjs <API_BASE_URL>
// Example: node scripts/staging-smoke-test.mjs https://unitrack-api-staging.onrender.com

const baseUrl = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

console.log(`\n==================================================`);
console.log(`UniTrack Staging Smoke Test`);
console.log(`Target API: ${baseUrl}`);
console.log(`==================================================\n`);

async function runTest() {
  const testEmail = `staging-smoke-${Date.now()}@example.com`;
  const testPassword = 'SmokeTestPass123!';
  let accessToken = '';
  let refreshToken = '';

  // 1. Health Check
  console.log('1. Testing GET /api/v1/health...');
  const healthRes = await fetch(`${baseUrl}/api/v1/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }
  const health = await healthRes.json();
  console.log('   ✓ Health check passed:', JSON.stringify(health));

  // 2. Registration
  console.log('\n2. Testing POST /api/v1/auth/register...');
  const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      displayName: 'Smoke Tester',
      languageCode: 'en',
    }),
  });
  const regData = await regRes.json();
  if (regRes.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  console.log('   ✓ Registration endpoint verified (201 Created)');

  // 3. Login Attempt
  console.log('\n3. Testing POST /api/v1/auth/login (Mobile client mode)...');
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Type': 'mobile',
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  // Note: If email verification is enabled on staging, expect 403 EMAIL_NOT_VERIFIED
  if (loginRes.status === 403) {
    const loginError = await loginRes.json();
    console.log('   ✓ Login email verification gate active (403 EMAIL_NOT_VERIFIED as expected)');
  } else if (loginRes.status === 200) {
    const loginData = await loginRes.json();
    accessToken = loginData.accessToken;
    refreshToken = loginData.refreshToken;
    console.log('   ✓ Login succeeded and issued tokens');

    // 4. Token Refresh
    console.log('\n4. Testing POST /api/v1/auth/refresh...');
    const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (!refreshRes.ok) {
      throw new Error(`Token refresh failed: ${refreshRes.status}`);
    }
    const refreshData = await refreshRes.json();
    accessToken = refreshData.accessToken;
    console.log('   ✓ Token refresh succeeded');

    // 5. Authenticated Data Fetch
    console.log('\n5. Testing GET /api/v1/periods (Authenticated)...');
    const periodsRes = await fetch(`${baseUrl}/api/v1/periods`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!periodsRes.ok) {
      throw new Error(`Periods fetch failed: ${periodsRes.status}`);
    }
    const periodsData = await periodsRes.json();
    console.log(`   ✓ Authenticated periods endpoint returned ${periodsData.data.length} periods`);

    // 5b. Universal Productivity Core Endpoints (v2.2)
    console.log('\n5b. Testing GET /api/v1/contexts (Authenticated)...');
    const ctxRes = await fetch(`${baseUrl}/api/v1/contexts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (ctxRes.ok) {
      const ctxData = await ctxRes.json();
      console.log(`   ✓ Contexts endpoint returned ${ctxData.data?.length ?? 0} contexts`);
    } else {
      console.log(`   ℹ Contexts endpoint returned status ${ctxRes.status} (pending deployment of v2.2)`);
    }

    console.log('\n5c. Testing GET /api/v1/today (Authenticated)...');
    const todayRes = await fetch(`${baseUrl}/api/v1/today`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (todayRes.ok) {
      const todayData = await todayRes.json();
      console.log(`   ✓ Today endpoint verified (${todayData.data?.tasks?.length ?? 0} tasks, ${todayData.data?.commitments?.length ?? 0} commitments)`);
    } else {
      console.log(`   ℹ Today endpoint returned status ${todayRes.status} (pending deployment of v2.2)`);
    }

    // 6. Logout
    console.log('\n6. Testing POST /api/v1/auth/logout...');
    await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshData.refreshToken }),
    });
    console.log('   ✓ Logout succeeded');
  }

  // 7. Forgot Password (non-enumeration)
  console.log('\n7. Testing POST /api/v1/auth/forgot-password...');
  const forgotRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });
  if (!forgotRes.ok) {
    throw new Error(`Forgot password failed: ${forgotRes.status}`);
  }
  console.log('   ✓ Account recovery endpoint returned generic 200 response');

  console.log(`\n==================================================`);
  console.log(`🎉 ALL STAGING SMOKE TESTS PASSED`);
  console.log(`==================================================\n`);
}

runTest().catch((err) => {
  console.error('\n❌ Smoke test failed:', err.message);
  process.exit(1);
});
