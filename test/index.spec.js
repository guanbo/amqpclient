'use strict';

const AMQPClient = require('..');
const consumer = new AMQPClient({}, 1000);
const producer = new AMQPClient();
// const { spawnSync } = require('child_process');
const http = require('http');

describe('AMQPClient', () => {
  const q = 'amqpclient.test';
  const message = 'test message';

  before((done) => {
    consumer.start(ch=>{
      return ch.assertQueue(q).then(ok=>{
        return ch.deleteQueue(q);
      });
    }).then((res)=>{
      consumer.close();
      done();
    });
  });

  it('should ok', (done) => {
    consumer.start((ch) => {
      return ch.assertQueue(q).then(ok => {
        return ch.consume(q, (msg) => {
          msg.should.be.Object();
          if (msg) {
            let body = msg.content.toString();
            body.should.be.equal(message);
            ch.ack(msg);
          }
          done();
        });
      });
    }).then(() => {
      let options = {
        host: '127.0.0.1',
        port: 15672,
        path: '/api/connections',
        auth: "guest:guest"
      }
      http.request(options, (res) => {
        let data = new Buffer(0);
        res.statusCode.should.be.equal(200);
        res.on('data', (trunked) => {
          data = Buffer.concat([data, trunked]);
        });
        res.on('end', () => {
          data = JSON.parse(data.toString());
          data.forEach(v => {
            let options = {
              host: '127.0.0.1',
              port: 15672,
              path: `/api/connections/${encodeURIComponent(v.name)}`,
              auth: "guest:guest",
              method: 'DELETE'
            }
            http.request(options, response => {
              let data = new Buffer(0);
              response.statusCode.should.be.equal(200);
            });
          });
        });
      }).end();
      // let res = spawnSync('rabbitmqctl', ['close_all_connections', 'test'], { shell: true });
      // return console.log(res);
      producer.start(ch => {
        return ch.assertQueue(q).then(ok => {
          return ch.sendToQueue(q, Buffer.from(message));
        });
      })
    })
  });
});