// Script to close all active pods using REST API
require('dotenv').config();

async function closeAllPods() {
  console.log('🗑️ CLOSING ALL ACTIVE PODS (REST API)');
  console.log('======================================');
  
  try {
    // Step 1: Get all pods using REST API
    console.log('\n📋 Step 1: Fetching all pods...');
    const response = await fetch('https://rest.runpod.io/v1/pods', {
      headers: {
        'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.log('❌ Error fetching pods:', response.status, response.statusText);
      return;
    }
    
    const pods = await response.json();
    console.log(`📊 Found ${pods.length} total pods`);
    
    // Filter for active pods (RUNNING, STARTING, etc.)
    const activePods = pods.filter(pod => 
      pod.status === 'RUNNING' || 
      pod.status === 'STARTING' || 
      pod.desiredStatus === 'RUNNING'
    );
    
    console.log(`🎯 Found ${activePods.length} active pods to terminate`);
    
    if (activePods.length === 0) {
      console.log('✅ No active pods found. All pods are already stopped.');
      return;
    }
    
    // Display active pods
    activePods.forEach((pod, index) => {
      console.log(`   ${index + 1}. ${pod.name} (${pod.id}) - ${pod.status} - $${pod.costPerHr}/hr`);
    });
    
    // Step 2: Terminate each active pod
    console.log('\n🗑️ Step 2: Terminating active pods...');
    
    const terminatePromises = activePods.map(async (pod, index) => {
      console.log(`\n🔄 Terminating pod ${index + 1}/${activePods.length}: ${pod.name}`);
      
      try {
        const terminateResponse = await fetch(`https://rest.runpod.io/v1/pods/${pod.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`
          }
        });
        
        if (terminateResponse.ok) {
          console.log(`✅ Successfully terminated ${pod.name}`);
          return { success: true, pod: pod.name };
        } else {
          const errorData = await terminateResponse.json();
          console.log(`❌ Failed to terminate ${pod.name}: ${terminateResponse.status} - ${JSON.stringify(errorData)}`);
          return { success: false, pod: pod.name, error: `${terminateResponse.status}: ${JSON.stringify(errorData)}` };
        }
        
      } catch (error) {
        console.log(`❌ Error terminating ${pod.name}: ${error.message}`);
        return { success: false, pod: pod.name, error: error.message };
      }
    });
    
    // Wait for all termination requests to complete
    const results = await Promise.all(terminatePromises);
    
    // Step 3: Summary
    console.log('\n📊 TERMINATION SUMMARY');
    console.log('======================');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successfully terminated: ${successful}/${activePods.length}`);
    console.log(`❌ Failed to terminate: ${failed}/${activePods.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed pods:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.pod}: ${result.error}`);
      });
    }
    
    console.log('\n🎉 Pod termination process completed!');
    
  } catch (error) {
    console.log('❌ Script execution failed:', error.message);
  }
}

// Run the script
closeAllPods().catch(console.error);