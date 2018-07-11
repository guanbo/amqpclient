'use strict';

const AMQPClient = require('..');
const rpcServer = new AMQPClient();
const rpcClient = new AMQPClient();
const { spawnSync } = require('child_process');

describe('RPC', () => {
  const q = 'test.rpc.request';

  before((done) => {
    rpcServer.rpcService(opts=>{
      const res = parseInt(opts.a)+parseInt(opts.b);
      return Promise.resolve({val: res});
    }, {queue: q}).then(()=>done(), done);
  });

  it('should ok', (done) => {
    rpcClient.rpc({a:1, b:2}, {queue: q}).then(res=>{
      res.val.should.be.equal(3);
      done();
    });
  });
});