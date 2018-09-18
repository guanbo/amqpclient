'use strict';

const AMQPClient = require('..');
const rpcServer = new AMQPClient();
const rpcClient = new AMQPClient();
const http = require('http');

const q = 'test.rpc.request';

describe('RPC', () => {
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

describe('RPC handle error', () => {
  before((done) => {
    rpcServer.rpcService(opts=>{
      return Promise.reject(opts);
    }, {queue: q}).then(()=>done(), done);
  });

  it('should handle error', (done) => {
    const err = new Error('test');
    err.code = 400;
    rpcClient.rpc(err, {queue: q}).then(res=>{
      res.should.have.property('code', 400);
      done();
    })
  });
});

describe('auto delete rpc queues', () => {
  before((done) => {
    rpcServer.rpcService(opts => {
      if(opts.model == 'Test') {
        return Promise.resolve({result: 0}); 
      }
    }, {queue: q}).then(() => done(), done);
  });

  it('should be ok', (done) => {
    RPC(10, done);
  });

  after('queues number', (done)=>{
    http.request({
      host: '127.0.0.1',
      port: 15672,
      path: '/api/queues',
      auth: "guest:guest"
    }, (res) => {
      let data = new Buffer(0);
      res.on('data', (trunked) => {
        data = Buffer.concat([data, trunked]);
      });
      res.on('end', () => {
        data = JSON.parse(data.toString());
        data.should.have.property('length', 2);
        done();
      });
    }).end();
  });
});

function RPC(times, cb) {
  rpcClient.rpc({model: 'Test', num: times}).then((result)=>{
    if (times <= 0) {
      cb();
    } else {
      RPC(times - 1, cb);
    }
  });
}