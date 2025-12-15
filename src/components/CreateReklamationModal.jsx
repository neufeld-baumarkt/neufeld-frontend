// src/components/CreateReklamationModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const today = new Date().toISOString().split('T')[0];

export default function CreateReklamationModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    filiale: '',
    art: '',
    datum: today,
    rekla_nr: '',
    lieferant: '',
    ls_nummer_grund: '',
    versand: false,
    tracking_id: '',
    artikelnummer: '',
    ean: '',
    bestell_menge: '',
    bestell_einheit: '',
    rekla_menge: '',
    rekla_einheit: '',
    status: 'Angelegt',
    letzte_aenderung: today,
  });

  const [options, setOptions] = useState({
    filialen: [],
    lieferanten: [],
    reklamationsarten: [],
    einheiten: [],
    status: [],
  });

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stammdaten laden
  useEffect(() => {
    const fetchAll = async () => {
      const token = sessionStorage.getItem('token');
      const cfg = { headers: { Authorization: `Bearer ${token}` } };

      try {
        const [f, l, a, e, s] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/filialen`, cfg),
          axios.get(`${import.meta.env.VITE_API_URL}/api/lieferanten`, cfg),
          axios.get(`${import.meta.env.VITE_API_URL}/api/reklamationsarten`, cfg),
          axios.get(`${import.meta.env.VITE_API_URL}/api/einheiten`, cfg),
          axios.get(`${import.meta.env.VITE_API_URL}/api/status`, cfg),
        ]);

        setOptions({
          filialen: f.data,
          lieferanten: l.data,
