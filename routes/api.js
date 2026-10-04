'use strict';

const crypto = require('crypto');

// Simple in-memory database
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

function cleanThread(thread) {
  return {
    _id: thread._id,
    text: thread.text,
    created_on: thread.created_on,
    bumped_on: thread.bumped_on,
    reported: thread.reported,
    replies: thread.replies
      .slice(-3)
      .map(cleanReply)
  };
}

function cleanReply(reply) {
  return {
    _id: reply._id,
    text: reply.text,
    created_on: reply.created_on,
    bumped_on: reply.bumped_on
  };
}

module.exports = function (app) {

  // =========================
  // THREADS
  // =========================

  // Create a new thread
  app.route('/api/threads/:board')
    .post(function (req, res) {

      const board = req.params.board;
      const text = req.body.text;
      const delete_password = req.body.delete_password;

      if (!text || !delete_password) {
        return res.status(400).json({
          error: 'text and delete_password are required'
        });
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

      return res.status(200).json(thread);
    })

    // Get 10 most recent threads
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

    // Report a thread
    .put(function (req, res) {

      const boardData = getBoard(req.params.board);
      const thread = boardData.find(function (item) {
        return item._id === req.body.report_id;
      });

      if (!thread) {
        return res.status(404).send('Thread not found');
      }

      thread.reported = true;

      return res.send('success');
    })

    // Delete a thread
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


  // =========================
  // REPLIES
  // =========================

  // Create a reply
  app.route('/api/replies/:board')
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

      return res.status(200).json(reply);
    })

    // Get all replies for a thread
    .get(function (req, res) {

      const boardData = getBoard(req.params.board);

      const thread = boardData.find(function (item) {
        return item._id === req.query.thread_id;
      });

      if (!thread) {
        return res.status(404).send('Thread not found');
      }

      return res.json(
        thread.replies.map(cleanReply)
      );
    })

    // Report a reply
    .put(function (req, res) {

      const boardData = getBoard(req.params.board);

      for (let i = 0; i < boardData.length; i++) {

        const thread = boardData[i];

        const reply = thread.replies.find(function (item) {
          return item._id === req.body.reply_id;
        });

        if (reply) {
          reply.reported = true;
          return res.send('success');
        }
      }

      return res.status(404).send('Reply not found');
    })

    // Delete a reply
    .delete(function (req, res) {

      const boardData = getBoard(req.params.board);

      for (let i = 0; i < boardData.length; i++) {

        const thread = boardData[i];

        const reply = thread.replies.find(function (item) {
          return item._id === req.body.reply_id;
        });

        if (reply) {

          if (reply.delete_password !== req.body.delete_password) {
            return res.send('incorrect password');
          }

          reply.text = '[deleted]';

          return res.send('success');
        }
      }

      return res.status(404).send('Reply not found');
    });

};