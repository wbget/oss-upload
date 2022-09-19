# oss-upload

对比文件名称不同，上传文件到阿里 oss

## Install

```
npm install -D oss-upload
```

## Usage

```
npx oss-upload test.json
```

```
// test.json
{
  "region": "oss-cn-shanghai",
  "accessKeyId": "xxxxxxxxxxx",
  "accessKeySecret": "xxxxxxxxxxxxxxxxxxxxxxxxx",
  "bucket": "my-bucket",
  "root": "./build/web-mobile",
  "remoteRoot": "my-game"
}
```
