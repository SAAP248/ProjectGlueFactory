/*
# Seed NFPA 72 Inspection Template (Placeholder)

## Summary
Seeds the initial NFPA 72 Fire Alarm System inspection form template with a
four-page structure. Exact approved questions will be replaced once the source
form is provided by WorkHorse. Template defines pages, sections, and fields
as structured JSON so the UI renders dynamically.

## Data Inserted
- One row in inspection_templates with code='nfpa72', version=1
*/

INSERT INTO inspection_templates (name, code, version, edition, pages)
VALUES (
  'NFPA 72 Fire Alarm System Inspection and Testing Form',
  'nfpa72',
  1,
  '2024 Edition (Placeholder)',
  '[
    {
      "title": "Page 1: Site & System Information",
      "sections": [
        {
          "title": "Property Information",
          "fields": [
            {"id": "prop_name", "label": "Property / Building Name", "type": "text", "required": true, "prefill": "company_name"},
            {"id": "prop_address", "label": "Property Address", "type": "text", "required": true, "prefill": "site_address"},
            {"id": "prop_city", "label": "City", "type": "text", "required": true, "prefill": "site_city"},
            {"id": "prop_state", "label": "State", "type": "text", "required": true, "prefill": "site_state"},
            {"id": "prop_zip", "label": "ZIP Code", "type": "text", "required": true, "prefill": "site_zip"},
            {"id": "prop_phone", "label": "Property Phone", "type": "text", "prefill": "site_phone"},
            {"id": "prop_contact", "label": "Property Contact", "type": "text", "prefill": "contact_name"},
            {"id": "prop_contact_phone", "label": "Contact Phone", "type": "text", "prefill": "contact_phone"},
            {"id": "prop_contact_email", "label": "Contact Email", "type": "text", "prefill": "contact_email"}
          ]
        },
        {
          "title": "Inspection Information",
          "fields": [
            {"id": "insp_date", "label": "Inspection Date", "type": "date", "required": true, "prefill": "inspection_date"},
            {"id": "insp_start_time", "label": "Start Time", "type": "time", "prefill": "inspection_start_time"},
            {"id": "insp_end_time", "label": "End Time", "type": "time"},
            {"id": "insp_type", "label": "Inspection Type", "type": "select", "required": true, "options": ["Initial Acceptance", "Reacceptance", "Annual", "Semi-Annual", "Quarterly", "Monthly", "Other"]},
            {"id": "insp_type_other", "label": "Other Inspection Type (specify)", "type": "text", "conditional": {"field": "insp_type", "value": "Other"}},
            {"id": "service_call_number", "label": "Service Call / Work Order #", "type": "text", "prefill": "wo_number"},
            {"id": "alarm_account_number", "label": "Alarm Account Number", "type": "text", "prefill": "alarm_account"}
          ]
        },
        {
          "title": "Servicing Company Information",
          "fields": [
            {"id": "svc_company_name", "label": "Company Name", "type": "text", "required": true, "prefill": "workhorse_company_name"},
            {"id": "svc_company_address", "label": "Company Address", "type": "text", "prefill": "workhorse_company_address"},
            {"id": "svc_company_phone", "label": "Company Phone", "type": "text", "prefill": "workhorse_company_phone"},
            {"id": "svc_license", "label": "License Number", "type": "text", "prefill": "workhorse_license"},
            {"id": "svc_inspector", "label": "Inspector Name", "type": "text", "required": true, "prefill": "technician_name"},
            {"id": "svc_inspector_cert", "label": "Inspector Certification #", "type": "text"}
          ]
        },
        {
          "title": "System Information",
          "fields": [
            {"id": "sys_manufacturer", "label": "FACP Manufacturer", "type": "text"},
            {"id": "sys_model", "label": "FACP Model", "type": "text"},
            {"id": "sys_software_rev", "label": "Software Revision", "type": "text"},
            {"id": "sys_install_date", "label": "Original Installation Date", "type": "date"},
            {"id": "sys_last_inspection", "label": "Last Inspection Date", "type": "date"},
            {"id": "sys_num_loops", "label": "Number of SLC Loops", "type": "number"},
            {"id": "sys_num_zones", "label": "Number of Zones", "type": "number"},
            {"id": "sys_power_type", "label": "Primary Power Source", "type": "select", "options": ["120VAC", "240VAC", "Other"]},
            {"id": "sys_battery_type", "label": "Battery Type", "type": "text"},
            {"id": "sys_battery_size", "label": "Battery Size (AH)", "type": "text"}
          ]
        },
        {
          "title": "Monitoring Information",
          "fields": [
            {"id": "mon_central_station", "label": "Central Station Name", "type": "text"},
            {"id": "mon_account_number", "label": "Monitoring Account #", "type": "text"},
            {"id": "mon_phone", "label": "Central Station Phone", "type": "text"},
            {"id": "mon_comm_method", "label": "Communication Method", "type": "select", "options": ["POTS", "Cellular", "IP", "Radio", "Dual Path", "Other"]},
            {"id": "mon_comm_method_other", "label": "Other Method (specify)", "type": "text", "conditional": {"field": "mon_comm_method", "value": "Other"}},
            {"id": "mon_notified", "label": "Central Station Notified Before Testing?", "type": "yes_no", "required": true},
            {"id": "mon_restored", "label": "Central Station Notified After Testing?", "type": "yes_no", "required": true}
          ]
        }
      ]
    },
    {
      "title": "Page 2: Visual Inspection",
      "sections": [
        {
          "title": "Fire Alarm Control Panel (FACP)",
          "fields": [
            {"id": "vi_facp_physical", "label": "FACP physical condition satisfactory", "type": "yes_no_na", "required": true},
            {"id": "vi_facp_secure", "label": "FACP securely mounted", "type": "yes_no_na", "required": true},
            {"id": "vi_facp_clean", "label": "FACP interior clean, no debris", "type": "yes_no_na", "required": true},
            {"id": "vi_facp_labeling", "label": "FACP properly labeled", "type": "yes_no_na", "required": true},
            {"id": "vi_facp_wiring", "label": "Wiring connections secure and properly terminated", "type": "yes_no_na", "required": true},
            {"id": "vi_facp_history", "label": "Event history reviewed", "type": "yes_no_na", "required": true},
            {"id": "vi_facp_trouble_log", "label": "Trouble conditions logged and addressed", "type": "yes_no_na", "required": true},
            {"id": "vi_facp_notes", "label": "FACP Notes / Deficiencies", "type": "textarea"}
          ]
        },
        {
          "title": "Notification Appliances",
          "fields": [
            {"id": "vi_nac_horns", "label": "Horns/strobes properly mounted and unobstructed", "type": "yes_no_na", "required": true},
            {"id": "vi_nac_coverage", "label": "Notification appliance coverage appears adequate", "type": "yes_no_na", "required": true},
            {"id": "vi_nac_candela", "label": "Candela ratings match design documents", "type": "yes_no_na", "required": true},
            {"id": "vi_nac_speakers", "label": "Speakers properly mounted (if applicable)", "type": "yes_no_na"},
            {"id": "vi_nac_notes", "label": "Notification Appliance Notes / Deficiencies", "type": "textarea"}
          ]
        },
        {
          "title": "Initiating Devices",
          "fields": [
            {"id": "vi_init_pulls", "label": "Manual pull stations accessible and unobstructed", "type": "yes_no_na", "required": true},
            {"id": "vi_init_smokes", "label": "Smoke detectors unobstructed and properly spaced", "type": "yes_no_na", "required": true},
            {"id": "vi_init_heats", "label": "Heat detectors unobstructed and properly spaced", "type": "yes_no_na", "required": true},
            {"id": "vi_init_ducts", "label": "Duct detectors accessible", "type": "yes_no_na"},
            {"id": "vi_init_flow", "label": "Waterflow switches accessible", "type": "yes_no_na"},
            {"id": "vi_init_tamper", "label": "Tamper switches accessible", "type": "yes_no_na"},
            {"id": "vi_init_beam", "label": "Beam detectors aligned and unobstructed", "type": "yes_no_na"},
            {"id": "vi_init_notes", "label": "Initiating Device Notes / Deficiencies", "type": "textarea"}
          ]
        },
        {
          "title": "Power Supplies",
          "fields": [
            {"id": "vi_pwr_main", "label": "Primary power supply connected and operational", "type": "yes_no_na", "required": true},
            {"id": "vi_pwr_circuit", "label": "Circuit breaker locked in ON position", "type": "yes_no_na", "required": true},
            {"id": "vi_pwr_breaker_labeled", "label": "Circuit breaker properly labeled", "type": "yes_no_na", "required": true},
            {"id": "vi_pwr_battery_condition", "label": "Batteries in acceptable condition (no corrosion/swelling)", "type": "yes_no_na", "required": true},
            {"id": "vi_pwr_battery_date", "label": "Battery date codes checked", "type": "yes_no_na", "required": true},
            {"id": "vi_pwr_battery_install_date", "label": "Battery Installation Date", "type": "date"},
            {"id": "vi_pwr_notes", "label": "Power Supply Notes / Deficiencies", "type": "textarea"}
          ]
        },
        {
          "title": "Building / Occupancy Conditions",
          "fields": [
            {"id": "vi_bldg_changes", "label": "Any building modifications since last inspection?", "type": "yes_no", "required": true},
            {"id": "vi_bldg_changes_desc", "label": "Describe modifications", "type": "textarea", "conditional": {"field": "vi_bldg_changes", "value": true}},
            {"id": "vi_bldg_occupancy_change", "label": "Has occupancy classification changed?", "type": "yes_no", "required": true},
            {"id": "vi_bldg_as_built", "label": "As-built drawings available on site?", "type": "yes_no"},
            {"id": "vi_bldg_notes", "label": "Building Condition Notes", "type": "textarea"}
          ]
        }
      ]
    },
    {
      "title": "Page 3: Functional Testing",
      "sections": [
        {
          "title": "FACP Functions",
          "fields": [
            {"id": "ft_facp_alarm", "label": "Panel alarm condition operates correctly", "type": "pass_fail", "required": true},
            {"id": "ft_facp_trouble", "label": "Panel trouble condition operates correctly", "type": "pass_fail", "required": true},
            {"id": "ft_facp_supervisory", "label": "Panel supervisory condition operates correctly", "type": "pass_fail", "required": true},
            {"id": "ft_facp_reset", "label": "Panel reset function operates correctly", "type": "pass_fail", "required": true},
            {"id": "ft_facp_silence", "label": "Alarm silence function operates correctly", "type": "pass_fail", "required": true},
            {"id": "ft_facp_drill", "label": "Fire drill function operates correctly", "type": "pass_fail"},
            {"id": "ft_facp_lamp_test", "label": "Lamp/LED test satisfactory", "type": "pass_fail", "required": true},
            {"id": "ft_facp_notes", "label": "FACP Functional Test Notes", "type": "textarea"}
          ]
        },
        {
          "title": "Communication / Signal Transmission",
          "fields": [
            {"id": "ft_comm_alarm_signal", "label": "Alarm signal received at central station", "type": "pass_fail", "required": true},
            {"id": "ft_comm_trouble_signal", "label": "Trouble signal received at central station", "type": "pass_fail", "required": true},
            {"id": "ft_comm_supervisory_signal", "label": "Supervisory signal received at central station", "type": "pass_fail"},
            {"id": "ft_comm_restore_signal", "label": "Restore signals received at central station", "type": "pass_fail", "required": true},
            {"id": "ft_comm_primary_path", "label": "Primary communication path operational", "type": "pass_fail", "required": true},
            {"id": "ft_comm_secondary_path", "label": "Secondary communication path operational (if applicable)", "type": "pass_fail"},
            {"id": "ft_comm_notes", "label": "Communication Test Notes", "type": "textarea"}
          ]
        },
        {
          "title": "Power Supply Testing",
          "fields": [
            {"id": "ft_pwr_ac_voltage", "label": "AC Voltage Reading (V)", "type": "number"},
            {"id": "ft_pwr_battery_voltage", "label": "Battery Voltage Under Load (V)", "type": "number"},
            {"id": "ft_pwr_battery_standby", "label": "Battery Standby Voltage (V)", "type": "number"},
            {"id": "ft_pwr_charger", "label": "Battery charger functioning properly", "type": "pass_fail", "required": true},
            {"id": "ft_pwr_transfer", "label": "Transfer to battery on AC failure", "type": "pass_fail", "required": true},
            {"id": "ft_pwr_ac_restore", "label": "Transfer back on AC restore", "type": "pass_fail", "required": true},
            {"id": "ft_pwr_ground_fault", "label": "Ground fault detection operational", "type": "pass_fail", "required": true},
            {"id": "ft_pwr_notes", "label": "Power Supply Test Notes", "type": "textarea"}
          ]
        },
        {
          "title": "Device Testing",
          "description": "Add a row for each device tested.",
          "fields": [
            {
              "id": "ft_device_table",
              "label": "Device Test Results",
              "type": "repeating_table",
              "columns": [
                {"id": "device_location", "label": "Location / Zone", "type": "text"},
                {"id": "device_type", "label": "Device Type", "type": "select", "options": ["Smoke Detector", "Heat Detector", "Duct Detector", "Pull Station", "Waterflow Switch", "Tamper Switch", "Beam Detector", "Monitor Module", "Control Module", "Relay Module", "Other"]},
                {"id": "device_address", "label": "Address / ID", "type": "text"},
                {"id": "device_manufacturer", "label": "Manufacturer", "type": "text"},
                {"id": "device_model", "label": "Model", "type": "text"},
                {"id": "device_sensitivity", "label": "Sensitivity Reading", "type": "text"},
                {"id": "device_result", "label": "Result", "type": "select", "options": ["Pass", "Fail", "N/A"]},
                {"id": "device_notes", "label": "Notes", "type": "text"}
              ]
            }
          ]
        },
        {
          "title": "Notification Appliance Testing",
          "fields": [
            {"id": "ft_nac_audible", "label": "Audible appliances activated and functional", "type": "pass_fail", "required": true},
            {"id": "ft_nac_visual", "label": "Visual appliances activated and functional", "type": "pass_fail", "required": true},
            {"id": "ft_nac_voice", "label": "Voice/speaker intelligibility acceptable (if applicable)", "type": "pass_fail"},
            {"id": "ft_nac_notes", "label": "Notification Appliance Test Notes", "type": "textarea"}
          ]
        },
        {
          "title": "Ancillary Functions",
          "fields": [
            {"id": "ft_anc_door_release", "label": "Door holder/release operates correctly", "type": "pass_fail"},
            {"id": "ft_anc_elevator_recall", "label": "Elevator recall operates correctly", "type": "pass_fail"},
            {"id": "ft_anc_elevator_shunt", "label": "Elevator shunt trip operates correctly", "type": "pass_fail"},
            {"id": "ft_anc_hvac", "label": "HVAC shutdown operates correctly", "type": "pass_fail"},
            {"id": "ft_anc_door_unlock", "label": "Door unlock/access control operates correctly", "type": "pass_fail"},
            {"id": "ft_anc_suppression", "label": "Suppression system interface operates correctly", "type": "pass_fail"},
            {"id": "ft_anc_other", "label": "Other ancillary functions (describe)", "type": "textarea"},
            {"id": "ft_anc_notes", "label": "Ancillary Function Test Notes", "type": "textarea"}
          ]
        }
      ]
    },
    {
      "title": "Page 4: Summary, Deficiencies & Signatures",
      "sections": [
        {
          "title": "System Device Count Summary",
          "fields": [
            {"id": "sum_total_smokes", "label": "Total Smoke Detectors", "type": "number"},
            {"id": "sum_total_heats", "label": "Total Heat Detectors", "type": "number"},
            {"id": "sum_total_pulls", "label": "Total Pull Stations", "type": "number"},
            {"id": "sum_total_ducts", "label": "Total Duct Detectors", "type": "number"},
            {"id": "sum_total_flow", "label": "Total Waterflow Switches", "type": "number"},
            {"id": "sum_total_tamper", "label": "Total Tamper Switches", "type": "number"},
            {"id": "sum_total_horns", "label": "Total Horns/Strobes", "type": "number"},
            {"id": "sum_total_speakers", "label": "Total Speakers", "type": "number"},
            {"id": "sum_total_modules", "label": "Total Modules (Monitor/Control)", "type": "number"},
            {"id": "sum_total_relays", "label": "Total Relay Modules", "type": "number"},
            {"id": "sum_devices_tested", "label": "Total Devices Tested", "type": "number"},
            {"id": "sum_devices_passed", "label": "Devices Passed", "type": "number"},
            {"id": "sum_devices_failed", "label": "Devices Failed", "type": "number"}
          ]
        },
        {
          "title": "Overall System Status",
          "fields": [
            {"id": "sum_system_operational", "label": "System returned to normal operating condition?", "type": "yes_no", "required": true},
            {"id": "sum_overall_result", "label": "Overall Inspection Result", "type": "select", "required": true, "options": ["Pass", "Pass with Deficiencies", "Fail"]},
            {"id": "sum_fail_reason", "label": "Reason for Failure (if applicable)", "type": "textarea", "conditional": {"field": "sum_overall_result", "value": "Fail"}},
            {"id": "sum_follow_up_required", "label": "Follow-up service required?", "type": "yes_no", "required": true},
            {"id": "sum_follow_up_desc", "label": "Describe follow-up needed", "type": "textarea", "conditional": {"field": "sum_follow_up_required", "value": true}}
          ]
        },
        {
          "title": "Deficiencies Found",
          "description": "List all deficiencies found during this inspection.",
          "fields": [
            {
              "id": "sum_deficiency_table",
              "label": "Deficiency List",
              "type": "repeating_table",
              "columns": [
                {"id": "def_location", "label": "Location", "type": "text"},
                {"id": "def_description", "label": "Description of Deficiency", "type": "text"},
                {"id": "def_priority", "label": "Priority", "type": "select", "options": ["Critical", "Non-Critical", "Recommendation"]},
                {"id": "def_corrected", "label": "Corrected On-Site?", "type": "select", "options": ["Yes", "No"]}
              ]
            }
          ]
        },
        {
          "title": "Comments and Recommendations",
          "fields": [
            {"id": "sum_comments", "label": "General Comments and Recommendations", "type": "textarea"}
          ]
        },
        {
          "title": "Signatures",
          "fields": [
            {"id": "sig_inspector", "label": "Inspector Signature", "type": "signature", "required": true, "signer_role": "technician"},
            {"id": "sig_inspector_name", "label": "Inspector Printed Name", "type": "text", "required": true, "prefill": "technician_name"},
            {"id": "sig_inspector_date", "label": "Date Signed", "type": "date", "required": true},
            {"id": "sig_customer", "label": "Customer / Authorized Representative Signature", "type": "signature", "required": true, "signer_role": "customer"},
            {"id": "sig_customer_name", "label": "Customer Printed Name", "type": "text", "required": true, "prefill": "contact_name"},
            {"id": "sig_customer_date", "label": "Date Signed", "type": "date", "required": true},
            {"id": "sig_customer_title", "label": "Title", "type": "text"}
          ]
        }
      ]
    }
  ]'::jsonb
) ON CONFLICT (code, version) DO NOTHING;
