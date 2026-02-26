const { withAndroidManifest, withMainApplication } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for DEEN AI Content Protection
 * Adds VPN service and permissions to Android
 */
module.exports = function withContentProtection(config) {
  // Add Android permissions and service
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    // Add permissions
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.INTERNET',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.BIND_VPN_SERVICE',
    ];

    permissions.forEach((permission) => {
      if (!manifest['uses-permission'].find((p) => p.$['android:name'] === permission)) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // Add VPN service
    if (!manifest.application) {
      manifest.application = [{}];
    }

    const application = manifest.application[0];
    
    if (!application.service) {
      application.service = [];
    }

    // Add ContentFilterVPNService
    const vpnService = {
      $: {
        'android:name': '.ContentFilterVPNService',
        'android:permission': 'android.permission.BIND_VPN_SERVICE',
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          action: [
            {
              $: { 'android:name': 'android.net.VpnService' },
            },
          ],
        },
      ],
    };

    // Check if service already exists
    const existingService = application.service.find(
      (s) => s.$['android:name'] === '.ContentFilterVPNService'
    );

    if (!existingService) {
      application.service.push(vpnService);
    }

    return config;
  });

  // Register the native module
  config = withMainApplication(config, async (config) => {
    if (config.modResults.language === 'java') {
      // Add import
      if (!config.modResults.contents.includes('import com.deenai.ContentProtectionPackage')) {
        config.modResults.contents = config.modResults.contents.replace(
          /import com.facebook.react.defaults.DefaultReactNativeHost;/,
          `import com.facebook.react.defaults.DefaultReactNativeHost;\nimport com.deenai.ContentProtectionPackage;`
        );
      }

      // Add package to getPackages()
      if (!config.modResults.contents.includes('new ContentProtectionPackage()')) {
        config.modResults.contents = config.modResults.contents.replace(
          /packages\.add\(new ModuleRegistryAdapter\(mModuleRegistryProvider\)\);/,
          `packages.add(new ModuleRegistryAdapter(mModuleRegistryProvider));\n          packages.add(new ContentProtectionPackage());`
        );
      }
    }

    return config;
  });

  return config;
};
