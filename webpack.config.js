const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[hash:7].[ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]'
        }
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html'
    })
  ],
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js'
    },
    extensions: ['.js', '.vue', '.json']
  },
  devServer: {
    static: {
      directory: path.join(__dirname, '.'),
    },
    compress: true,
    port: 3000,
    historyApiFallback: true,
    setupMiddlewares: (middlewares, devServer) => {
      const fs = require('fs');
      const path = require('path');
      
      // 确保pdf.worker.js可以从public目录提供
      devServer.app.get('/pdf.worker.js', (req, res) => {
        const workerPath = path.resolve(__dirname, 'public', 'pdf.worker.js');
        if (fs.existsSync(workerPath)) {
          res.sendFile(workerPath);
        } else {
          res.status(404).send('File not found');
        }
      });
      
      return middlewares;
    }
  }
};