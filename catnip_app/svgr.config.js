/** Skip SVGO — AK fire_selector.svg fails SVGO parse (embedded raster entity limit). */
module.exports = {
  native: true,
  plugins: ['@svgr/plugin-jsx'],
};
