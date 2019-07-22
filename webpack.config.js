const path = require('path');

module.exports = {
    entry: './js/index.js',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'midicube.js',
        library: 'MIDI',
        libraryTarget: 'umd',
        umdNamedDefine: true,
    },
    mode: 'production',
    devtool: 'source-map',
    // devtool: 'inline-source-map',
    module: {
        rules: [
             {
              test: /\.js?$/,
              exclude: /(node_modules|bower_components|soundfont|soundfonts)/,
              use: [{
                  loader: 'babel-loader',
                  options: {
                      presets: ['@babel/preset-env'],
                      plugins: [
                          '@babel/plugin-transform-object-assign',
                          '@babel/plugin-proposal-export-namespace-from',
                      ],
                  },
              }],
            },
        ],
    },
};
