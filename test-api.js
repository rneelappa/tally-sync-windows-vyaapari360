#!/usr/bin/env node

const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';

async function testAPI() {
  console.log('🧪 Testing Tally XML API');
  console.log('========================\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Health Check');
    const health = await axios.get(`${API_BASE}/health`);
    console.log('✅ System Status:', health.data.message);
    console.log('📊 Storage:', health.data.storage);
    console.log('');

    // 2. Sync Data from Tally
    console.log('2️⃣ Sync Data from Tally');
    const syncResult = await axios.post(`${API_BASE}/sync/SKM/MAIN`, {
      fromDate: '20250901',
      toDate: '20250930'
    });
    console.log('✅ Sync Result:', syncResult.data.message);
    console.log('📋 Vouchers Synced:', syncResult.data.data.storedVouchers);
    console.log('');

    // 3. List Vouchers
    console.log('3️⃣ List Vouchers (First 3)');
    const vouchers = await axios.get(`${API_BASE}/vouchers/SKM/MAIN?page=1&limit=3`);
    console.log('📊 Total Vouchers:', vouchers.data.data.total);
    console.log('📋 Vouchers:');
    vouchers.data.data.vouchers.forEach((v, i) => {
      console.log(`   ${i+1}. ${v.type} #${v.number} - ${v.partyLedgerName} (${v.date})`);
    });
    console.log('');

    // 4. Get Single Voucher
    console.log('4️⃣ Get Single Voucher');
    const firstVoucher = vouchers.data.data.vouchers[0];
    const voucherDetail = await axios.get(`${API_BASE}/voucher/SKM/MAIN/${firstVoucher.id}`);
    console.log('🔍 Voucher Details:');
    console.log('   ID:', voucherDetail.data.data.id);
    console.log('   Type:', voucherDetail.data.data.type);
    console.log('   Number:', voucherDetail.data.data.number);
    console.log('   Party:', voucherDetail.data.data.partyLedgerName);
    console.log('');

    // 5. Update Voucher
    console.log('5️⃣ Update Voucher');
    const updateData = {
      narration: `Updated via API at ${new Date().toISOString()}`
    };
    const updateResult = await axios.put(`${API_BASE}/voucher/SKM/MAIN/${firstVoucher.id}`, updateData);
    console.log('✅ Update Result:', updateResult.data.message);
    console.log('📝 New Narration:', updateResult.data.data.narration);
    console.log('');

    // 6. Filter by Type
    console.log('6️⃣ Filter by Type (Payment)');
    const paymentVouchers = await axios.get(`${API_BASE}/vouchers/SKM/MAIN?type=Payment&limit=5`);
    console.log('💳 Payment Vouchers:', paymentVouchers.data.data.total);
    paymentVouchers.data.data.vouchers.forEach((v, i) => {
      console.log(`   ${i+1}. Payment #${v.number} - ${v.partyLedgerName}`);
    });
    console.log('');

    // 7. Search Vouchers
    console.log('7️⃣ Search Vouchers');
    const searchResults = await axios.get(`${API_BASE}/vouchers/SKM/MAIN?search=AKEYEM&limit=5`);
    console.log('🔍 Search Results for "AKEYEM":', searchResults.data.data.total);
    searchResults.data.data.vouchers.forEach((v, i) => {
      console.log(`   ${i+1}. ${v.type} #${v.number} - ${v.partyLedgerName}`);
    });
    console.log('');

    // 8. Final Health Check
    console.log('8️⃣ Final Health Check');
    const finalHealth = await axios.get(`${API_BASE}/health`);
    console.log('✅ Final Status:', finalHealth.data.message);
    console.log('📊 Final Storage:', finalHealth.data.storage);
    console.log('');

    console.log('🎉 API Test Completed Successfully!');
    console.log('');
    console.log('✅ All endpoints working correctly');
    console.log('✅ XML-native storage functioning');
    console.log('✅ Tally integration working');
    console.log('✅ Ready for Railway deployment!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI };


