import autocannon from 'autocannon';

const instance = autocannon({
  url: 'https://s.wyzwyz.xyz/7tQzbOm',
  connections: 50, // concurrent connections
  duration: 10, // seconds
  pipelining: 1,
}, (err, result) => {
  console.log(result);
});

autocannon.track(instance, { renderProgressBar: true });