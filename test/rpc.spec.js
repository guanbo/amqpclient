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

function getQueues(callback) {
  http.request({
    host: '127.0.0.1',
    port: 15672,
    path: '/api/queues',
    auth: "guest:guest"
  }, (res) => {
    let data = new Buffer.alloc(0);
    res.on('data', (trunked) => {
      data = Buffer.concat([data, trunked]);
    });
    res.on('end', () => {
      callback(JSON.parse(data.toString()));
    });
  }).end();
}

describe('auto delete rpc queues', () => {
  let queues;
  before((done) => {
    rpcServer.rpcService(opts => {
      console.log(opts);
      if(opts.model == 'Test') {
        return Promise.resolve({result: 0}); 
      }
    }, {queue: q}).then(() => done(), done);
  });

  before((done) => {
    getQueues((data)=>{
      data.should.have.property('length');
      queues = data.length;
      done();
    })
  });

  for (let t = 0; t < 10; t++) {
    describe('RPC times: '+t, () => {
      it('should ok', (done) => {
        rpcClient.rpc({model: 'Test', num: t}, {queue: q}).then((result)=>{
          result.should.have.property('result', 0);
          done();
        });
      });
    });      
  }

  after('queues number', (done)=>{
    setTimeout(() => {
      getQueues((data)=>{
        data.should.have.property('length', queues);
        done();
      });
    }, 1000);
  });
});
