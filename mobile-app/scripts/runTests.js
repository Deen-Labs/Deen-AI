const path = require('path');
const fs = require('fs');

// Lightweight mocks for react-native, expo, and async-storage in Node CLI test runner
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (moduleName) {
  if (moduleName === 'react-native') {
    return {
      Platform: { OS: 'android', select: (obj) => obj.android || obj.default },
      Alert: { alert: () => {} },
      Switch: () => null,
      StyleSheet: { create: (s) => s, absoluteFill: {} },
      Modal: () => null,
      View: () => null,
      Text: () => null,
      TextInput: () => null,
      TouchableOpacity: () => null,
      ScrollView: () => null,
      KeyboardAvoidingView: () => null,
      TouchableWithoutFeedback: () => null,
      Keyboard: { dismiss: () => {} },
      ActivityIndicator: () => null,
      Dimensions: { get: () => ({ width: 375, height: 812 }) },
      Clipboard: { setString: () => {} },
      Linking: { openURL: async () => {}, sendIntent: async () => {} },
      Animated: { Value: class { constructor(v) { this.val = v; } } },
    };
  }
  if (moduleName === '@react-native-async-storage/async-storage') {
    const store = new Map();
    const mockStorage = {
      getItem: async (k) => store.get(k) || null,
      setItem: async (k, v) => store.set(k, v),
      removeItem: async (k) => store.delete(k),
      multiRemove: async (keys) => keys.forEach((k) => store.delete(k)),
    };
    mockStorage.default = mockStorage;
    return mockStorage;
  }
  if (moduleName.startsWith('expo') || moduleName.startsWith('@expo')) {
    return {
      Feather: () => null,
      useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
      default: { executionEnvironment: 'bare' },
      ExecutionEnvironment: { StoreClient: 'storeClient' },
      openURL: async () => {},
      parse: () => ({}),
    };
  }
  return originalRequire.apply(this, arguments);
};

// Transpile typescript files on the fly
const ts = require('typescript');

require.extensions['.ts'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: filename,
  });
  module._compile(transpiled.outputText, filename);
};

require.extensions['.tsx'] = require.extensions['.ts'];

// Execute test suite
const { runAllCoreFunctionalityTests } = require('../lib/__tests__/coreFunctionality.test');

Promise.resolve(runAllCoreFunctionalityTests())
  .then((success) => {
    if (success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('Test Suite Failed with Exception:', err);
    process.exit(1);
  });
