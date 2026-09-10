/*
# Add NAC Circuit Device Table to NFPA 72 Notification Appliance Testing

## Summary
Updates the Notification Appliance Testing section (Page 3, section index 4) of the
NFPA 72 template to include a repeating table for documenting each device on the
NAC circuit. Columns: Type, Manufacturer, Model #, Serial #, Location, and a
product photo column.

## Modified Tables
- `inspection_templates` - Updated the pages JSON for code='nfpa72', version=1
  to insert a NAC device inventory repeating table before the pass/fail test fields.
*/

UPDATE inspection_templates
SET pages = jsonb_set(
  pages,
  '{2,sections,4}',
  '{
    "title": "Notification Appliance Testing",
    "description": "Document each device on the NAC circuit, then test the appliances.",
    "fields": [
      {
        "id": "ft_nac_device_table",
        "label": "NAC Circuit Device Inventory",
        "type": "repeating_table",
        "columns": [
          {"id": "nac_type", "label": "Type", "type": "select", "options": ["Horn", "Strobe", "Horn/Strobe", "Speaker", "Speaker/Strobe", "Mini Horn", "Chime", "Bell", "Other"]},
          {"id": "nac_manufacturer", "label": "Manufacturer", "type": "text"},
          {"id": "nac_model", "label": "Model #", "type": "text"},
          {"id": "nac_serial", "label": "Serial #", "type": "text"},
          {"id": "nac_location", "label": "Location", "type": "text"},
          {"id": "nac_candela", "label": "Candela", "type": "text"},
          {"id": "nac_result", "label": "Result", "type": "select", "options": ["Pass", "Fail", "N/A"]},
          {"id": "nac_photo", "label": "Photo", "type": "photo"},
          {"id": "nac_notes", "label": "Notes", "type": "text"}
        ]
      },
      {"id": "ft_nac_audible", "type": "pass_fail", "label": "Audible appliances activated and functional", "required": true},
      {"id": "ft_nac_visual", "type": "pass_fail", "label": "Visual appliances activated and functional", "required": true},
      {"id": "ft_nac_voice", "type": "pass_fail", "label": "Voice/speaker intelligibility acceptable (if applicable)"},
      {"id": "ft_nac_notes", "type": "textarea", "label": "Notification Appliance Test Notes"}
    ]
  }'::jsonb
)
WHERE code = 'nfpa72' AND version = 1;
