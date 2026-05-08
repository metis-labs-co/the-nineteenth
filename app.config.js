require('dotenv').config();

const base = require('./app.json');

const iosKey = process.env.GOOGLE_MAPS_API_KEY_IOS;
const androidKey = process.env.GOOGLE_MAPS_API_KEY_ANDROID;

if (!iosKey) {
  console.warn(
    '[app.config] GOOGLE_MAPS_API_KEY_IOS is not set — iOS maps will not render. Add it to .env (local) or as an EAS env var (builds).'
  );
}
if (!androidKey) {
  console.warn(
    '[app.config] GOOGLE_MAPS_API_KEY_ANDROID is not set — Android maps will not render. Add it to .env (local) or as an EAS env var (builds).'
  );
}

module.exports = () => {
  const expo = { ...base.expo };

  expo.ios = {
    ...expo.ios,
    config: {
      ...expo.ios?.config,
      googleMapsApiKey: iosKey,
    },
  };

  expo.android = {
    ...expo.android,
    config: {
      ...expo.android?.config,
      googleMaps: {
        ...expo.android?.config?.googleMaps,
        apiKey: androidKey,
      },
    },
  };

  return { expo };
};
