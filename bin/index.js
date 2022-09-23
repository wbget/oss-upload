#!/usr/bin/env node

const OSS = require('ali-oss');
const readdirp = require('readdirp');
const ProgressBar = require('progress');
const path = require('path');
const fs = require('fs');

const configPath = process.argv[2];
if (!configPath) {
  console.error('ERROR: 需要指定配置');
  process.exit(-1);
}
const from = path.resolve(process.cwd(), configPath);
const config = JSON.parse(fs.readFileSync(from).toString('utf8'));
const root = path.dirname(from);

const client = new OSS(config);

const WEB_PATH = path.resolve(root, config.root);
const OSS_PATH = config.remoteRoot;
const remotes = [];
let errors = [];
const maxKeys = 1000;
let marker = null;
async function list() {
  do {
    const result = await client.list({
      marker,
      'max-keys': maxKeys,
    });
    marker = result.nextMarker;
    if (result.objects) {
      remotes.push(...result.objects.map(v => v.name));
    }
  } while (marker);
}

(async () => {
  const files = await readdirp.promise(WEB_PATH);
  await list();
  const upload = async (name, path) =>
    await new Promise(resolve => {
      // if (Math.random() < 0.2) {
      //   errors.push({ name, path });
      // }
      // resolve();
      // return;
      client.put(name, path).then(result => {
        if (result) {
          resolve();
        } else {
          console.log('error', name, path);
          errors.push({ name, path });
        }
      });
    }).catch(() => {});
  const targets = files
    .map(value => {
      const { path: p, fullPath } = value;
      const name = path.join(OSS_PATH, p).replace(/\\/g, '/')
      if (p === 'index.html') return { name, path: fullPath };
      if (remotes.findIndex(p => p === name) !== -1) {
        return null;
      }
      return { name, path: fullPath };
    })
    .filter(v => !!v);
  console.table(targets, ['name', 'path']);
  console.log(`需要上传文件数：${targets.length}`);
  process.stdin.setEncoding('utf8');

  process.stdin.on('readable', async () => {
    const bar = new ProgressBar('[:bar]:percent', {
      width: 20,
      total: targets.length,
    });
    for await (const target of targets) {
      const { name, path } = target;
      await upload(name, path);
      bar.tick();
      if (bar.complete) {
        console.log('targets complete');
      }
    }
    while (errors.length > 0) {
      const errs = errors.slice();
      errors = [];
      const bar1 = new ProgressBar('[:bar]:percent', {
        width: 20,
        total: errs.length,
      });
      for await (const target of errs) {
        const { name, path } = target;
        await upload(name, path);
        bar1.tick();
        if (bar1.complete) {
          console.log(`errors [${errs.length}] complete`);
        }
      }
    }
  });
})();
