const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {

  let threadId;
  let replyId;

  const board = 'testboard';

  // 1. Create thread
  test('Creating a new thread: POST /api/threads/{board}', function (done) {

    chai.request(server)
      .post('/api/threads/' + board)
      .send({
        text: 'Test thread',
        delete_password: '12345'
      })
      .end(function (err, res) {

        assert.equal(res.status, 200);
        assert.property(res.body, '_id');

        threadId = res.body._id;

        done();
      });

  });


  // 2. Get threads
  test('Viewing the 10 most recent threads with 3 replies each: GET /api/threads/{board}', function (done) {

    chai.request(server)
      .get('/api/threads/' + board)
      .end(function (err, res) {

        assert.equal(res.status, 200);
        assert.isArray(res.body);

        assert.isAtMost(res.body.length, 10);

        res.body.forEach(function (thread) {

          assert.property(thread, '_id');
          assert.property(thread, 'text');
          assert.property(thread, 'created_on');
          assert.property(thread, 'bumped_on');
          assert.property(thread, 'reported');
          assert.property(thread, 'replies');

          assert.isArray(thread.replies);
          assert.isAtMost(thread.replies.length, 3);

        });

        done();
      });

  });


  // 3. Delete thread wrong password
  test('Deleting a thread with the incorrect password', function (done) {

    chai.request(server)
      .delete('/api/threads/' + board)
      .send({
        thread_id: threadId,
        delete_password: 'wrong-password'
      })
      .end(function (err, res) {

        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');

        done();
      });

  });


  // 4. Delete thread correct password
  test('Deleting a thread with the correct password', function (done) {

    // Create another thread first
    chai.request(server)
      .post('/api/threads/' + board)
      .send({
        text: 'Thread to delete',
        delete_password: 'correct-password'
      })
      .end(function (err, res) {

        const id = res.body._id;

        chai.request(server)
          .delete('/api/threads/' + board)
          .send({
            thread_id: id,
            delete_password: 'correct-password'
          })
          .end(function (err, response) {

            assert.equal(response.status, 200);
            assert.equal(response.text, 'success');

            done();
          });

      });

  });


  // 5. Report thread
  test('Reporting a thread: PUT /api/threads/{board}', function (done) {

    chai.request(server)
      .put('/api/threads/' + board)
      .send({
        report_id: threadId
      })
      .end(function (err, res) {

        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');

        done();
      });

  });


  // 6. Create reply
  test('Creating a new reply: POST /api/replies/{board}', function (done) {

    chai.request(server)
      .post('/api/replies/' + board)
      .send({
        thread_id: threadId,
        text: 'Test reply',
        delete_password: 'reply-password'
      })
      .end(function (err, res) {

        assert.equal(res.status, 200);
        assert.property(res.body, '_id');

        replyId = res.body._id;

        done();
      });

  });


  // 7. Get replies
  test('Viewing a thread with all replies: GET /api/replies/{board}', function (done) {

    chai.request(server)
      .get('/api/replies/' + board)
      .query({
        thread_id: threadId
      })
      .end(function (err, res) {

        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtLeast(res.body.length, 1);

        done();
      });

  });


  // 8. Delete reply wrong password
  test('Deleting a reply with the incorrect password', function (done) {

    chai.request(server)
      .delete('/api/replies/' + board)
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: 'wrong-password'
      })
      .end(function (err, res) {

        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');

        done();
      });

  });


  // 9. Delete reply correct password
  test('Deleting a reply with the correct password', function (done) {

    chai.request(server)
      .delete('/api/replies/' + board)
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: 'reply-password'
      })
      .end(function (err, res) {

        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');

        done();
      });

  });


  // 10. Report reply
  test('Reporting a reply: PUT /api/replies/{board}', function (done) {

    // Create a fresh reply because the previous one is already deleted
    chai.request(server)
      .post('/api/replies/' + board)
      .send({
        thread_id: threadId,
        text: 'Reply to report',
        delete_password: 'another-password'
      })
      .end(function (err, res) {

        const newReplyId = res.body._id;

        chai.request(server)
          .put('/api/replies/' + board)
          .send({
            reply_id: newReplyId
          })
          .end(function (err, response) {

            assert.equal(response.status, 200);
            assert.equal(response.text, 'success');

            done();
          });

      });

  });

});