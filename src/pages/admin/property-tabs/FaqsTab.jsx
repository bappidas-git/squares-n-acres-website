import React from 'react';
import { Box, Typography, TextField, Button, IconButton, Paper } from '@mui/material';
import { Icon } from '@iconify/react';

const FaqsTab = ({ formData, updateField }) => {
  const faqs = formData.faqs || [];

  const updateFaq = (index, field, value) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    updateField('faqs', updated);
  };

  const addFaq = () => {
    updateField('faqs', [...faqs, { question: '', answer: '' }]);
  };

  const removeFaq = (index) => {
    updateField('faqs', faqs.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1B2A4A' }}>
        Frequently Asked Questions
      </Typography>
      <Typography variant="caption" sx={{ color: '#9CA3AF', mt: -1 }}>
        Add custom FAQs for this property. If left empty, default FAQs will be auto-generated from the property data.
      </Typography>

      {faqs.map((faq, index) => (
        <Paper key={index} sx={{ p: 2, borderRadius: 2, border: '1px solid #E5E7EB' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#6B7280' }}>
              FAQ #{index + 1}
            </Typography>
            {faqs.length > 1 && (
              <IconButton size="small" onClick={() => removeFaq(index)} sx={{ color: '#EF4444' }}>
                <Icon icon="mdi:close-circle-outline" style={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              size="small"
              label="Question"
              value={faq.question}
              onChange={(e) => updateFaq(index, 'question', e.target.value)}
              fullWidth
              placeholder="e.g., What is the possession date?"
            />
            <TextField
              size="small"
              label="Answer"
              value={faq.answer}
              onChange={(e) => updateFaq(index, 'answer', e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Provide a detailed answer..."
            />
          </Box>
        </Paper>
      ))}

      <Button
        size="small"
        variant="text"
        onClick={addFaq}
        startIcon={<Icon icon="mdi:plus" />}
        sx={{ color: '#6B7280', alignSelf: 'flex-start' }}
      >
        Add FAQ
      </Button>
    </Box>
  );
};

export default FaqsTab;
