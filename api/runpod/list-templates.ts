import { getRunpodRestClient } from './client';

interface Template {
  id: string;
  name: string;
  imageName: string;
  isPublic: boolean;
  isRunpod: boolean;
  isServerless: boolean;
  category: string;
  ports: string[];
  env: Record<string, string>;
  containerDiskInGb: number;
  volumeInGb: number;
  volumeMountPath: string;
  dockerEntrypoint: string[];
  dockerStartCmd: string[];
  readme: string;
  earned: number;
  runtimeInMin?: number;
  containerRegistryAuthId?: string;
}

interface TemplatesResponse {
  data: Template[];
}

async function listTemplates(): Promise<void> {
  console.log('📋 LISTING RUNPOD TEMPLATES');
  console.log('=' .repeat(50));

  try {
    const client = getRunpodRestClient();
    
    // List all templates including private ones
    const response = await client.getTemplates(true, true, true);

    if (response.data && Array.isArray(response.data)) {
      const templates: Template[] = response.data;
      
      console.log(`✅ Found ${templates.length} templates`);
      console.log('');

      // Filter for private templates
      const privateTemplates = templates.filter(t => !t.isPublic && !t.isRunpod);
      console.log(`🔒 Private Templates (${privateTemplates.length}):`);
      console.log('=' .repeat(30));
      
      privateTemplates.forEach((template, index) => {
        console.log(`\n${index + 1}. ${template.name}`);
        console.log(`   ID: ${template.id}`);
        console.log(`   Image: ${template.imageName}`);
        console.log(`   Category: ${template.category}`);
        console.log(`   Ports: ${template.ports ? template.ports.join(', ') : 'None'}`);
        console.log(`   Container Disk: ${template.containerDiskInGb}GB`);
        console.log(`   Volume: ${template.volumeInGb}GB at ${template.volumeMountPath}`);
        console.log(`   Serverless: ${template.isServerless ? 'Yes' : 'No'}`);
        
        if (template.dockerStartCmd && template.dockerStartCmd.length > 0) {
          console.log(`   Start Command: ${template.dockerStartCmd.join(' ')}`);
        }
        
        if (template.dockerEntrypoint && template.dockerEntrypoint.length > 0) {
          console.log(`   Entrypoint: ${template.dockerEntrypoint.join(' ')}`);
        }
        
        if (template.env && Object.keys(template.env).length > 0) {
          console.log(`   Environment Variables:`);
          Object.entries(template.env).forEach(([key, value]) => {
            console.log(`     ${key}=${value}`);
          });
        }
        
        if (template.readme) {
          console.log(`   Description: ${template.readme.substring(0, 100)}...`);
        }
      });

      // Look for "Startup Template"
      const startupTemplate = privateTemplates.find(t => 
        t.name.toLowerCase().includes('startup') || 
        t.name.toLowerCase().includes('template')
      );

      if (startupTemplate) {
        console.log('\n🎯 FOUND STARTUP TEMPLATE:');
        console.log('=' .repeat(30));
        console.log(`Name: ${startupTemplate.name}`);
        console.log(`ID: ${startupTemplate.id}`);
        console.log(`Image: ${startupTemplate.imageName}`);
        console.log(`Ports: ${startupTemplate.ports.join(', ')}`);
        console.log(`Start Command: ${startupTemplate.dockerStartCmd?.join(' ') || 'None'}`);
        console.log(`Entrypoint: ${startupTemplate.dockerEntrypoint?.join(' ') || 'None'}`);
        
        if (startupTemplate.env && Object.keys(startupTemplate.env).length > 0) {
          console.log(`Environment Variables:`);
          Object.entries(startupTemplate.env).forEach(([key, value]) => {
            console.log(`  ${key}=${value}`);
          });
        }
      } else {
        console.log('\n❌ No template found with "Startup" in the name');
        console.log('Available private template names:');
        privateTemplates.forEach(t => console.log(`  - ${t.name}`));
      }

      // Show RunPod official templates for reference
      const runpodTemplates = templates.filter(t => t.isRunpod);
      console.log(`\n🏢 RunPod Official Templates (${runpodTemplates.length}):`);
      console.log('=' .repeat(40));
      
      runpodTemplates.slice(0, 5).forEach((template, index) => {
        console.log(`${index + 1}. ${template.name} (${template.id})`);
        console.log(`   Image: ${template.imageName}`);
        console.log(`   Ports: ${template.ports ? template.ports.join(', ') : 'None'}`);
      });
      
      if (runpodTemplates.length > 5) {
        console.log(`   ... and ${runpodTemplates.length - 5} more`);
      }

    } else {
      console.log('❌ No templates found or invalid response format');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error listing templates:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  listTemplates().catch(console.error);
}

export { listTemplates };
