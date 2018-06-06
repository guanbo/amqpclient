# AMQP Client

An AMQP Client of Node.js base on amqplib with auto reconnect

## Quick Start

### Consumer 

```js
const AMQPClient = require('amqp.node.client');
const producer = new AMQPClient({}, 1000);

const q = 'amqpclient.test';

producer.start((ch) => {
  return ch.assertQueue(q).then(ok => {
    return ch.consume(q, (msg) => {
      msg.should.be.Object();
      if (msg) {
        let body = msg.content.toString();
        console.log(body);
        ch.ack(msg);
      }
    });
  });
});
```

### Disconnect

```shell
$ rabbitmqctl close_all_connections test_reconnect_case
```

### Producer 

```js
const AMQPClient = require('amqp.node.client');
const consumer = new AMQPClient();

const q = 'amqpclient.test';
const message = 'test message';

consumer.start(ch => {
  ch.assertQueue(q).then(ok => {
    ch.sendToQueue(q, Buffer.from(message));
  });
});
```