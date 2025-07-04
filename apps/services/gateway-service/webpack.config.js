const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../../dist/apps/services/gateway-service'),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
  ],
  externals: {
    '@mikro-orm/core': 'commonjs @mikro-orm/core',
    '@nestjs/mongoose': 'commonjs @nestjs/mongoose',
    '@nestjs/sequelize': 'commonjs @nestjs/sequelize',
    '@nestjs/typeorm': 'commonjs @nestjs/typeorm',
    '@nestjs/swagger': 'commonjs @nestjs/swagger',
  },
};
