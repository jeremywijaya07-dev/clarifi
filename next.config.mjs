/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Redirect webpack's filesystem cache to AppData\Local (outside OneDrive).
    // When the project lives in an OneDrive folder, sync operations corrupt the
    // cache checksum files which causes Tailwind CSS to vanish on every hot-reload.
    // Moving the cache dir outside the sync boundary fixes it permanently.
    const appData = process.env.LOCALAPPDATA;
    if (appData && config.cache && typeof config.cache === 'object') {
      config.cache.cacheDirectory = `${appData}\\.clarifi-webpack`;
    } else if (!appData) {
      // Non-Windows fallback: disable persistent cache entirely
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
