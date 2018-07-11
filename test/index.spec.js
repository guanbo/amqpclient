'use strict';

const AMQPClient = require('..');
const consumer = new AMQPClient({}, 1000);
const producer = new AMQPClient();
const { spawnSync } = require('child_process');

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
      let res = spawnSync('rabbitmqctl', ['close_all_connections', 'test'], { shell: true });
      // return console.log(res);
      producer.start(ch => {
        return ch.assertQueue(q).then(ok => {
          return ch.sendToQueue(q, Buffer.from(message));
        });
      })
    })
  });
});