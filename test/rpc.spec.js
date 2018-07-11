'use strict';

const AMQPClient = require('..');
const rpcServer = new AMQPClient();
const rpcClient = new AMQPClient();
const { spawnSync } = require('child_process');

describe('RPC', () => {
  const q = 'test.rpc.request';
  const array = [1, 2, 3, 4];
  let count = 0;

  before((done) => {
    rpcServer.rpcService(opts=>{
      const res = parseInt(opts.a)+parseInt(opts.b);
      return Promise.resolve({val: res});
    }, {queue: q}).then(()=>done(), done);
  });

  function rpc(times) {
    describe('#Call No: '+times, () => {
      it('should ok', () => {
        rpcClient.rpc({a: times, b:1}, {queue: q}).then(res=>{
          res.val.should.be.equal(times+1);
          count++;
        });
      });    
    });
  }

  array.forEach(rpc);

  after((done) => {
    let intervalId = setInterval(()=>{
      if (count >= array.length) {
        clearInterval(intervalId);
        done();
      }
    }, 300);
  });
});