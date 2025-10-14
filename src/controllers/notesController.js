import createHttpError from 'http-errors';

import { Note } from '../models/note.js';

export const getAllNotes = async (req, res) => {
  const { page = 1, perPage = 10, search, tag } = req.query;

  const skip = (page - 1) * perPage;

  // Базовий об’єкт фільтра
  const filter = {};

  // 🔍 Якщо є пошук — використовуємо $text
  if (search) {
    filter.$text = { $search: search };
  }

  // 🏷️ Якщо є фільтр за тегом
  if (tag) {
    filter.tag = tag;
  }

  // Основний запит з урахуванням пошуку і тегу
  const notesQuery = Note.find(filter);

  // Якщо є пошук, додаємо сортування за релевантністю
  if (search) {
    notesQuery.sort({ score: { $meta: 'textScore' } });
    notesQuery.select({ score: { $meta: 'textScore' } });
  }

  const [totalNotes, notes] = await Promise.all([
    Note.countDocuments(filter),
    notesQuery.skip(skip).limit(perPage),
  ]);

  const totalPages = Math.ceil(totalNotes / perPage);

  res.status(200).json({
    page: Number(page),
    perPage: Number(perPage),
    totalNotes,
    totalPages,
    notes,
  });
};

export const getNoteById = async (req, res, next) => {
  const { noteId } = req.params;
  const note = await Note.findById(noteId);

  if (!note) {
    next(createHttpError(404, 'Note not found'));
    return;
  }

  res.status(200).json(note);
};

export const createNote = async (req, res) => {
  const note = await Note.create(req.body);
  res.status(201).json(note);
};

export const deleteNote = async (req, res, next) => {
  const { noteId } = req.params;
  const note = await Note.findOneAndDelete({
    _id: noteId,
  });

  if (!note) {
    next(createHttpError(404, 'Note not found'));
    return;
  }

  res.status(200).send(note);
};

export const updateNote = async (req, res, next) => {
  const { noteId } = req.params;

  const note = await Note.findOneAndUpdate({ _id: noteId }, req.body, {
    new: true,
  });

  if (!note) {
    next(createHttpError(404, 'Note not found'));
    return;
  }

  res.status(200).json(note);
};
