import createHttpError from 'http-errors';

import { Note } from '../models/note.js';

export const getAllNotes = async (req, res, next) => {
  try {
    const { page = 1, perPage = 10, search, tag } = req.query;
    const pageNum = Number(page);
    const perPageNum = Number(perPage);
    const skip = (pageNum - 1) * perPageNum;

    const baseFilter = { userId: req.user._id };
    if (tag) baseFilter.tag = tag;

    let notes = [];
    let totalNotes = 0;

    if (search) {
      // 1. Пробуем $text
      const textFilter = { ...baseFilter, $text: { $search: search } };
      totalNotes = await Note.countDocuments(textFilter);

      if (totalNotes > 0) {
        notes = await Note.find(textFilter)
          .sort({ score: { $meta: 'textScore' } })
          .select({ score: { $meta: 'textScore' } })
          .skip(skip)
          .limit(perPageNum);
      } else {
        // 2. Пробуем $regex
        const regexFilter = {
          ...baseFilter,
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } },
          ],
        };

        totalNotes = await Note.countDocuments(regexFilter);
        notes = await Note.find(regexFilter).skip(skip).limit(perPageNum);
      }
    } else {
      totalNotes = await Note.countDocuments(baseFilter);
      notes = await Note.find(baseFilter).skip(skip).limit(perPageNum);
    }

    const totalPages = Math.ceil(totalNotes / perPageNum);

    res.status(200).json({
      page: pageNum,
      perPage: perPageNum,
      totalNotes,
      totalPages,
      notes,
    });
  } catch (error) {
    next(error);
  }
};

export const getNoteById = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const note = await Note.findOne({ _id: noteId, userId: req.user._id });

    if (!note) return next(createHttpError(404, 'Note not found'));

    res.status(200).json(note);
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const note = await Note.create({
      ...req.body,
      userId: req.user._id,
    });

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;

    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId: req.user._id },
      req.body,
      { new: true },
    );

    if (!note) return next(createHttpError(404, 'Note not found'));

    res.status(200).json(note);
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const note = await Note.findOneAndDelete({
      _id: noteId,
      userId: req.user._id,
    });

    if (!note) return next(createHttpError(404, 'Note not found'));

    res.status(200).json(note);
  } catch (error) {
    next(error);
  }
};
