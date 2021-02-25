const path = require("path");
const { VueLoaderPlugin } = require("vue-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require('webpack');

module.exports = (env = {}) => ({
    mode: env.prod ? "production" : "development",
    devtool: env.prod ? "source-map" : "eval-cheap-module-source-map",
    // The application entry point
    entry: "./src/index.js",

    module: {
        rules: [
            {
                test: /\.vue$/,
                use: "vue-loader"
            },
            //use babel-loader to transpile js files
            {
                test: /\.js$/,
                loader: "babel-loader"
            },

            // css-loader to bundle all the css files into one file and vue-style-loader
            // to add all the styles inside the <style> block in `.vue` file.
            {
                test: /\.css$/,
                use: [
                    process.env.NODE_ENV !== 'production'
                        ? 'style-loader'
                        : MiniCssExtractPlugin.loader,
                    'css-loader'
                ]
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.vue', '.json'],
        alias: {
            '@': path.resolve('src'),
        }
    },
    // Where to compile the bundle
    // By default the output directory is `dist`
    output: {
        path: path.join(__dirname, "../dist"),
        filename: "bundle.js"
    },
    devServer: {
        contentBase: path.join(__dirname, "../public"),
        port: 3000,
        publicPath: "/dist/"
    },
    plugins: [
        // make sure to include the plugin for the magic
        new VueLoaderPlugin(),
        new MiniCssExtractPlugin({
            filename: "style.css"
        }),
        new webpack.DefinePlugin({
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: false
        })
    ]
});