import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cases = ['aetherforge-commercial', 'aetherforge-workbench'].flatMap((app) =>
  [
    [true, 202],
    [true, 503],
    [false, 202],
  ].map(([enabled, status]) => [app, enabled, status]),
);

test.each(cases)(
  '%s default environment wiring: reporting=%s, collector=%s',
  (app, enabled, status) => {
    const serverUrl = new URL('../../apps/' + app + '/server.mjs', import.meta.url).href;
    const assetRoot = fileURLToPath(new URL('../../package.json', import.meta.url));
    const code = `
    import assert from 'node:assert/strict';
    import {createServer} from 'node:http';
    const enabled=${enabled}, status=${status};
    const nativeFetch=globalThis.fetch, received=[], deliveries=[];
    const collector=createServer(async(req,res)=>{
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      received.push({method:req.method,contentType:req.headers['content-type'],body:JSON.parse(Buffer.concat(chunks).toString('utf8'))});
      res.writeHead(status);res.end();
    });
    await new Promise(r=>collector.listen(0,'127.0.0.1',r));
    const localCollector='http://127.0.0.1:'+collector.address().port;
    const endpoint='https://collector.example.com/ingest';
    process.env.AETHERFORGE_ERROR_REPORTING=enabled?'1':'0';
    process.env.AETHERFORGE_ERROR_WEBHOOK_URL=endpoint;
    globalThis.fetch=(url,options)=>{
      if(url===endpoint){const delivery=nativeFetch(localCollector,options);deliveries.push(delivery);return delivery;}
      assert.ok(String(url).startsWith('http://127.0.0.1:'));return nativeFetch(url,options);
    };
    const {createWorkbenchServer}=await import(${JSON.stringify(serverUrl)});
    const server=createWorkbenchServer({assetRoot:${JSON.stringify(assetRoot)}});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    try{
      const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/assets?token=NEVER_SEND_THIS');
      assert.equal(response.status,500);assert.deepEqual(await response.json(),{error:'Workbench request failed'});
      await Promise.all(deliveries);await new Promise(r=>setImmediate(r));
      process.stdout.write(JSON.stringify({probe:'server-webhook',received})+'\\n');
    }finally{
      server.closeAllConnections();collector.closeAllConnections();
      await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>collector.close(r))]);
    }
  `;
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
      encoding: 'utf8',
      timeout: 15000,
    });
    const records = stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(records.filter((record) => record.event === 'http.request.unhandled')).toHaveLength(1);
    const probe = records.find((record) => record.probe === 'server-webhook');
    expect(probe.received).toHaveLength(enabled ? 1 : 0);
    if (enabled) {
      expect(probe.received[0]).toMatchObject({
        method: 'POST',
        contentType: 'application/json',
        body: {
          schemaVersion: 1,
          event: 'http.request.unhandled',
          route: '/api/assets',
          method: 'GET',
          statusCode: 500,
        },
      });
      expect(Object.keys(probe.received[0].body).sort()).toEqual([
        'event',
        'method',
        'requestId',
        'route',
        'schemaVersion',
        'statusCode',
      ]);
      expect(probe.received[0].body.requestId).toMatch(/^[a-f0-9-]{36}$/u);
    }
    expect(stdout).not.toMatch(/NEVER_SEND_THIS|package\.json|ENOENT|stack/u);
  },
  20000,
);
