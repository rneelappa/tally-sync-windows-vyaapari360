#!/usr/bin/env node

/**
 * Count vouchers in TDL response
 */

const axios = require('axios');

async function countVouchersInResponse() {
  console.log('🔍 Counting vouchers in TDL response...\n');
  
  try {
    const response = await axios.get(
      'https://tally-sync-vyaapari360-production.up.railway.app/api/v1/tallysync/debug/629f49fb-983e-4141-8c48-e1423b39e921/37f3cc0c-58ad-4baf-b309-360116ffc3cd',
      { timeout: 15000 }
    );
    
    if (response.data.success && response.data.debug.responsePreview) {
      const fullResponse = response.data.debug.responsePreview;
      
      // Count FLDGUID occurrences
      const guidMatches = fullResponse.match(/<FLDGUID>/g);
      const guidCount = guidMatches ? guidMatches.length : 0;
      
      console.log(`📊 Response Analysis:`);
      console.log(`- Total response length: ${response.data.debug.responseLength} characters`);
      console.log(`- FLDGUID tags found: ${guidCount}`);
      console.log(`- Vouchers extracted by API: ${response.data.debug.vouchersExtracted}`);
      
      if (guidCount > 1) {
        console.log(`\n⚠️ ISSUE IDENTIFIED:`);
        console.log(`- Response contains ${guidCount} vouchers`);
        console.log(`- But API only extracts ${response.data.debug.vouchersExtracted} voucher`);
        console.log(`- Parser is missing ${guidCount - response.data.debug.vouchersExtracted} vouchers!`);
      }
      
      // Show preview of multiple vouchers
      console.log(`\n📋 Response Preview (first 1000 chars):`);
      console.log(fullResponse.substring(0, 1000));
      
      // Look for patterns
      const voucherNumbers = fullResponse.match(/<FLDVOUCHERNUMBER>(.*?)<\/FLDVOUCHERNUMBER>/g);
      if (voucherNumbers) {
        console.log(`\n📋 Found ${voucherNumbers.length} voucher numbers:`);
        voucherNumbers.slice(0, 10).forEach((match, index) => {
          const number = match.replace(/<\/?FLDVOUCHERNUMBER>/g, '');
          console.log(`  ${index + 1}. ${number}`);
        });
        if (voucherNumbers.length > 10) {
          console.log(`  ... and ${voucherNumbers.length - 10} more`);
        }
      }
      
    } else {
      console.log('❌ Failed to get debug response');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

countVouchersInResponse();
