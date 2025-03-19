const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');

// Determine if this is a production build
const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  
  // Entry point
  entry: './src/index.tsx',
  
  // Output configuration
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
    chunkFilename: isProduction ? 'js/[name].[contenthash].chunk.js' : 'js/[name].chunk.js',
    publicPath: '/',
    
    // Configure worker output filename
    globalObject: 'self', // Required for workers to work correctly
    
    // Configure separate worker chunks
    asyncChunks: true,
  },
  
  // Development server configuration
  devServer: {
    historyApiFallback: true,
    static: path.join(__dirname, 'public'),
    compress: true,
    port: 3000,
    hot: true,
    open: true,
  },
  
  // Enable source maps for development
  devtool: isProduction ? 'source-map' : 'eval-source-map',
  
  // Configure loaders
  module: {
    rules: [
      // TypeScript/JavaScript
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
            plugins: [
              ['@babel/plugin-transform-runtime', { regenerator: true }],
            ],
          },
        },
      },
      
      // CSS/SCSS
      {
        test: /\.(css|scss)$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          'postcss-loader',
          'sass-loader',
        ],
      },
      
      // Images
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
        generator: {
          filename: 'images/[name].[hash][ext]',
        },
      },
      
      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]',
        },
      },
      
      // Worker loader - Special configuration for Web Workers
      {
        test: /\.worker\.(js|ts)$/,
        use: { 
          loader: 'worker-loader',
          options: { 
            // Workers will be in their own files, named as worker.[hash].js
            filename: isProduction ? 'js/[name].[contenthash].worker.js' : 'js/[name].worker.js',
            // Use classic web workers by default
            worker: 'Worker',
          }
        },
      },
      
      // Configuration for our calculation worker specifically
      {
        test: /calculationWorker\.(js|ts)$/,
        use: { 
          loader: 'worker-loader',
          options: { 
            // Special name for the calculation worker
            filename: isProduction ? 'js/calculation.[contenthash].worker.js' : 'js/calculation.worker.js',
            // Use module workers for ES module support
            worker: 'Worker',
          }
        },
      },
    ],
  },
  
  // Configure plugins
  plugins: [
    // Clean the dist folder before building
    new CleanWebpackPlugin(),
    
    // Generate HTML file
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: './public/favicon.ico',
      minify: isProduction ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      } : false,
    }),
    
    // Extract CSS files
    new MiniCssExtractPlugin({
      filename: isProduction ? 'css/[name].[contenthash].css' : 'css/[name].css',
      chunkFilename: isProduction ? 'css/[name].[contenthash].chunk.css' : 'css/[name].chunk.css',
    }),
    
    // Define environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.SUPPORT_WORKERS': JSON.stringify(true), // Enables worker feature detection
    }),
    
    // Enable hot module replacement
    new webpack.HotModuleReplacementPlugin(),
  ],
  
  // Optimization configuration
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
        parallel: true,
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: 'all',
      name: false,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        // Create separate chunk for hydraulics calculations
        hydraulics: {
          test: /[\\/]features[\\/]calculator[\\/]utils[\\/]hydraulics[\\/]/,
          name: 'hydraulics',
          chunks: 'all',
          priority: 10, // higher priority than the vendors chunk
        },
      },
    },
    runtimeChunk: 'single',
  },
  
  // Resolve extensions and modules
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@stores': path.resolve(__dirname, 'src/stores'),
    },
    // Ensure worker files can be properly imported
    fallback: {
      "worker_threads": false,
    },
  },
  
  // Advanced performance configuration
  performance: {
    hints: isProduction ? 'warning' : false,
    // Increase the max sizes to account for worker bundles
    maxEntrypointSize: 512000, // 500KiB
    maxAssetSize: 512000, // 500KiB
  },
  
  // Generate stats for bundle analysis
  stats: {
    children: false,
    modules: false,
  },
};