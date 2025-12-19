import { view } from './storybook.requires';

const StorybookUIRoot = view.getStorybookUI({
  // Optional: enable async storage for persisting Storybook state
  storage: {
    getItem: async (key: string) => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return AsyncStorage.setItem(key, value);
    },
  },
});

export default StorybookUIRoot;
