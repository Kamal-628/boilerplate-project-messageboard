'use strict';

const crypto = require('crypto');

// In-memory database
const boards = {};

function getBoard(board) {
  if (!boards[board]) {
    boards[board] = [];
  }

  return boards[board];
}

function createId() {
  return crypto.randomBytes(12).toString('hex');
}

// Remove private fields before sending thread to client
function cleanThread(thread) {
  return {
    _id: thread._id,
    text: thread.text,
    created_on: thread.created_on,
    bumped_on: thread.bumped_on,
    replies: thread.replies
      .slice(-3)
      .map(cleanReply)
  };
}

// Remove private fields before sending reply to client
function cleanReply(reply) {
  return {
    _id: reply._id,
    text: reply.text,
    created_on: reply.created_on,
    bumped_on: reply.bumped_on
  };
}

module.exports = function (app) {

  // ==========================================
  // THREADS
  // ==========================================

  app.route('/api/threads/:board')

    // CREATE THREAD
    .post(function (req, res) {

      const board = req.params.board;

      const text = req.body.text;
      const delete_password = req.body.delete_password;

      if (!text || !delete_password) {
        return res.status(400).send('Missing required fields');
      }

      const now = new Date();

      const thread = {
        _id: createId(),
        text: text,
        created_on: now,
        bumped_on: now,
        reported: false,
        delete_password: delete_password,
        replies: []
      };

      const boardData = getBoard(board);

      boardData.push(thread);

      return res.json(thread);
    })


    // GET 10 MOST RECENT THREADS
    .get(function (req, res) {

      const boardData = getBoard(req.params.board);

      const threads = boardData
        .slice()
        .sort(function (a, b) {
          return new Date(b.bumped_on) - new Date(a.bumped_on);
        })
        .slice(0, 10)
        .map(cleanThread);

      return res.json(threads);
    })


    // REPORT THREAD
    .put(function (req, res) {

      const boardData = getBoard(req.params.board);

      const thread = boardData.find(function (item) {
        return item._id === req.body.thread_id;
      });

      if (!thread) {
        return res.status(404).send('Thread not found');
      }

      thread.reported = true;

      return res.send('reported');
    })


    // DELETE THREAD
    .delete(function (req, res) {

      const boardData = getBoard(req.params.board);

      const index = boardData.findIndex(function (item) {
        return item._id === req.body.thread_id;
      });

      if (index === -1) {
        return res.status(404).send('Thread not found');
      }

      const thread = boardData[index];

      if (thread.delete_password !== req.body.delete_password) {
        return res.send('incorrect password');
      }

      boardData.splice(index, 1);

      return res.send('success');
    });


  // ==========================================
  // REPLIES
  // ==========================================

  app.route('/api/replies/:board')

    // CREATE REPLY
    .post(function (req, res) {

      const boardData = getBoard(req.params.board);

      const thread = boardData.find(function (item) {
        return item._id === req.body.thread_id;
      });

      if (!thread) {
        return res.status(404).send('Thread not found');
      }

      const now = new Date();

      const reply = {
        _id: createId(),
        text: req.body.text,
        created_on: now,
        bumped_on: now,
        delete_password: req.body.delete_password,
        reported: false
      };

      thread.replies.push(reply);

      // Reply bumps the thread
      thread.bumped_on = now;

      return res.json(reply);
    })


    // GET ENTIRE THREAD WITH ALL REPLIES
    .get(function (req, res) {

      const boardData = getBoard(req.params.board);

      const thread = boardData.find(function (item) {
        return item._id === req.query.thread_id;
      });

      if (!thread) {
        return res.status(404).send('Thread not found');
      }

      const result = {
        _id: thread._id,
        text: thread.text,
        created_on: thread.created_on,
        bumped_on: thread.bumped_on,
        replies: thread.replies.map(function (reply) {
          return {
            _id: reply._id,
            text: reply.text,
            created_on: reply.created_on,
            bumped_on: reply.bumped_on
          };
        })
      };

      return res.json(result);
    })


    // REPORT REPLY
    .put(function (req, res) {

      const boardData = getBoard(req.params.board);

      const thread = boardData.find(function (item) {
        return item._id === req.body.thread_id;
      });

      if (!thread) {
        return res.status(404).send('Thread not found');
      }

      const reply = thread.replies.find(function (item) {
        return item._id === req.body.reply_id;
      });

      if (!reply) {
        return res.status(404).send('Reply not found');
      }

      reply.reported = true;

      return res.send('reported');
    })


    // DELETE REPLY
    .delete(function (req, res) {

      const boardData = getBoard(req.params.board);

      const thread = boardData.find(function (item) {
        return item._id === req.body.thread_id;
      });

      if (!thread) {
        return res.status(404).send('Thread not found');
      }

      const reply = thread.replies.find(function (item) {
        return item._id === req.body.reply_id;
      });

      if (!reply) {
        return res.status(404).send('Reply not found');
      }

      if (reply.delete_password !== req.body.delete_password) {
        return res.send('incorrect password');
      }

      // FCC requirement: change reply text to [deleted]
      reply.text = '[deleted]';

      return res.send('success');
    });

};