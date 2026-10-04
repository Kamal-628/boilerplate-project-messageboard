const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {

  const board = 'testboard';

  let threadId;
  let replyId;


  // 1. Creating a new thread
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
        assert.property(res.body, 'text');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'bumped_on');
        assert.property(res.body, 'reported');
        assert.property(res.body, 'delete_password');
        assert.property(res.body, 'replies');

        threadId = res.body._id;

        done();
      });
  });


  // 2. Viewing the 10 most recent threads
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
          assert.property(thread, 'replies');

          assert.notProperty(thread, 'delete_password');
          assert.notProperty(thread, 'reported');

          assert.isArray(thread.replies);
          assert.isAtMost(thread.replies.length, 3);

        });

        done();
      });
  });


  // 3. Delete thread - incorrect password
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


  // 4. Delete thread - correct password
  test('Deleting a thread with the correct password', function (done) {

    chai.request(server)
      .post('/api/threads/' + board)
      .send({
        text: 'Thread to delete',
        delete_password: 'delete123'
      })
      .end(function (err, res) {

        const deleteThreadId = res.body._id;

        chai.request(server)
          .delete('/api/threads/' + board)
          .send({
            thread_id: deleteThreadId,
            delete_password: 'delete123'
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
        thread_id: threadId
      })
      .end(function (err, res) {

        assert.equal(res.status, 200);

        // FCC requirement
        assert.equal(res.text, 'reported');

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
        delete_password: 'reply123'
      })
      .end(function (err, res) {

        assert.equal(res.status, 200);
        assert.property(res.body, '_id');

        replyId = res.body._id;

        done();
      });
  });


  // 7. View thread with all replies
  test('Viewing a thread with all replies: GET /api/replies/{board}', function (done) {

    chai.request(server)
      .get('/api/replies/' + board)
      .query({
        thread_id: threadId
      })
      .end(function (err, res) {

        assert.equal(res.status, 200);
        assert.isObject(res.body);

        assert.equal(res.body._id, threadId);
        assert.property(res.body, 'text');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'bumped_on');
        assert.property(res.body, 'replies');

        assert.notProperty(res.body, 'delete_password');
        assert.notProperty(res.body, 'reported');

        assert.isArray(res.body.replies);

        res.body.replies.forEach(function (reply) {

          assert.property(reply, '_id');
          assert.property(reply, 'text');
          assert.property(reply, 'created_on');
          assert.property(reply, 'bumped_on');

          assert.notProperty(reply, 'delete_password');
          assert.notProperty(reply, 'reported');

        });

        done();
      });
  });


  // 8. Delete reply - incorrect password
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


  // 9. Delete reply - correct password
  test('Deleting a reply with the correct password', function (done) {

    chai.request(server)
      .post('/api/replies/' + board)
      .send({
        thread_id: threadId,
        text: 'Reply to delete',
        delete_password: 'delete-reply'
      })
      .end(function (err, res) {

        const deleteReplyId = res.body._id;

        chai.request(server)
          .delete('/api/replies/' + board)
          .send({
            thread_id: threadId,
            reply_id: deleteReplyId,
            delete_password: 'delete-reply'
          })
          .end(function (err, response) {

            assert.equal(response.status, 200);

            // DELETE must return success
            assert.equal(response.text, 'success');

            done();
          });
      });
  });


  // 10. Report reply
  test('Reporting a reply: PUT /api/replies/{board}', function (done) {

    chai.request(server)
      .post('/api/replies/' + board)
      .send({
        thread_id: threadId,
        text: 'Reply to report',
        delete_password: 'report-reply'
      })
      .end(function (err, res) {

        const reportReplyId = res.body._id;

        chai.request(server)
          .put('/api/replies/' + board)
          .send({
            thread_id: threadId,
            reply_id: reportReplyId
          })
          .end(function (err, response) {

            assert.equal(response.status, 200);

            // REPORT must return reported
            assert.equal(response.text, 'reported');

            done();
          });
      });
  });

});