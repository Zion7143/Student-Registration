"use strict";

/* =========================================
   ELEMENT REFERENCES
========================================= */

const form = document.getElementById("enrollmentForm");
const formSteps = [...document.querySelectorAll(".form-step")];
const progressSteps = [...document.querySelectorAll(".step")];
const stepperNav = document.getElementById("stepperNav");

const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const progressBar = document.querySelector(".progress-bar");
const autoSaveIndicator = document.getElementById("autoSaveIndicator");

const notification = document.getElementById("globalNotification");

const departmentSelect = document.getElementById("department");
const programSelect = document.getElementById("program");

// Custom Combobox Elements
const regionInput = document.getElementById("region");
const provinceInput = document.getElementById("province");
const cityInput = document.getElementById("city");
const barangayInput = document.getElementById("barangay");

const regionList = document.getElementById("regionList");
const provinceList = document.getElementById("provinceList");
const cityList = document.getElementById("cityList");
const barangayList = document.getElementById("barangayList");

const confirmationCheck = document.getElementById("confirmationCheck");
const confirmationError = document.getElementById("confirmationError");
const submitBtn = document.getElementById("submitBtn");
const saveExitBtn = document.getElementById("saveExitBtn");

const restoreModal = document.getElementById("restoreModal");
const guideModal = document.getElementById("guideModal");
const clearModal = document.getElementById("clearModal");
const restoreDraftBtn = document.getElementById("restoreDraftBtn");
const discardDraftBtn = document.getElementById("discardDraftBtn");
const confirmClearBtn = document.getElementById("confirmClearBtn");

const newEnrollmentBtn = document.getElementById("newEnrollmentBtn");
const copyReferenceBtn = document.getElementById("copyReferenceBtn");
const printBtn = document.getElementById("printBtn");

// Calendar Elements
const birthDateInput = document.getElementById("birthDate");
const calTriggerBtn = document.getElementById("calTriggerBtn");
const customCalendar = document.getElementById("customCalendar");
const calPrevMonth = document.getElementById("calPrevMonth");
const calNextMonth = document.getElementById("calNextMonth");
const calMonthSelect = document.getElementById("calMonthSelect");
const calYearSelect = document.getElementById("calYearSelect");
const calDaysContainer = document.getElementById("calDaysContainer");

const STORAGE_KEY = "dlsjbcEnrollmentDraftV1";
const ADDRESS_DATA_URL = "https://raw.githubusercontent.com/flores-jacob/philippine-regions-provinces-cities-municipalities-barangays/master/philippine_provinces_cities_municipalities_and_barangays_2019v2.json";

let currentStep = 1;
let saveTimer = null;
let notificationTimer = null;
let lastFocusedElement = null;
let calendarDate = new Date(); 

// Global variable to store the fetched address data
let phAddressData = null;
let draftDecisionPending = false; 

/* =========================================
   REGION DISPLAY NAMES MAPPING
========================================= */
const regionDisplayNames = {
  "REGION I": "Region I (Ilocos Region)",
  "REGION II": "Region II (Cagayan Valley)",
  "REGION III": "Region III (Central Luzon)",
  "REGION IV-A": "Region IV-A (CALABARZON)",
  "REGION IV-B": "Region IV-B (MIMAROPA)",
  "REGION V": "Region V (Bicol Region)",
  "REGION VI": "Region VI (Western Visayas)",
  "REGION VII": "Region VII (Central Visayas)",
  "REGION VIII": "Region VIII (Eastern Visayas)",
  "REGION IX": "Region IX (Zamboanga Peninsula)",
  "REGION X": "Region X (Northern Mindanao)",
  "REGION XI": "Region XI (Davao Region)",
  "REGION XII": "Region XII (SOCCSKSARGEN)",
  "REGION XIII": "Region XIII (Caraga)",
  "NCR": "National Capital Region (NCR)",
  "CAR": "Cordillera Administrative Region (CAR)",
  "BARMM": "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)",
  "NIR": "Negros Island Region (NIR)"
};

/* =========================================
   PROGRAM OPTIONS (DLSJBC MAPPING)
========================================= */

const programsByDepartment = {
  "College of Computer Studies": ["Bachelor of Science in Computer Science", "Bachelor of Science in Information Technology"],
  "College of Business and Accountancy": ["Bachelor of Science in Business Administration", "Bachelor of Science in Accountancy"],
  "College of Hospitality and Tourism Management": ["Bachelor of Science in Hospitality Management", "Bachelor of Science in Tourism Management"],
  "College of Teacher Education": ["Bachelor of Elementary Education", "Bachelor of Secondary Education"],
  "Manpower Skills Training Program": ["Caregiving", "Healthcare Assistant"],
  "TVET Programs and TESDA Diploma Programs": ["Diploma in Travel and Tour", "Diploma in Hospitality Services Technology", "Diploma in Information Technology", "Diploma in Education"]
};

/* =========================================
   VALIDATION CONFIGURATION
========================================= */

const validationRules = {
  studentId: {
    required: false,
    label: "Student ID",
    validate(value) {
      if (!value) return ""; 
      if (!/^\d{7}$/.test(value)) {
        return "Format must be YYXXXXX (e.g., 2500001).";
      }
      return "";
    }
  },
  firstName: { required: true, label: "First name", validate(value) { return validateName(value, "First name"); } },
  middleName: { 
    required: false, 
    label: "Middle name", 
    validate(value) { 
      if (!value) return ""; 
      return validateName(value, "Middle name"); 
    } 
  },
  lastName: { required: true, label: "Last name", validate(value) { return validateName(value, "Last name"); } },
  birthDate: {
    required: true, label: "Date of birth",
    validate(value) {
      if (!value) return "Date of birth is required.";
      
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        return "Please enter a complete date (MM/DD/YYYY).";
      }
      
      const parts = value.split('/');
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      const selectedDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      if (selectedDate.getMonth() !== month - 1 || selectedDate.getDate() !== day || year < 1900) return "Enter a real date of birth (MM/DD/YYYY).";
      if (selectedDate > today) return "Date of birth cannot be in the future.";
      return "";
    }
  },
  sex: { required: true, label: "Sex" },
  religion: { required: true, label: "Religion", validate(value) { return validateName(value, "Religion"); } },
  civilStatus: { required: true, label: "Civil status" },
  email: {
    required: true, label: "Email address",
    validate(value) {
      if (!value) return "Email address is required.";
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailPattern.test(value)) return "Enter a valid email address, such as student@email.com.";
      return "";
    }
  },
  mobile: { required: true, label: "Mobile number", validate(value) { return validatePhilippineMobile(value, "Mobile number"); } },
  region: { required: true, label: "Region", validate(value) { return comboboxHasOption(regionList, value) ? "" : "Please choose region from the list."; } },
  province: { required: true, label: "Province", validate(value) { return comboboxHasOption(provinceList, value) ? "" : "Please choose province from the list."; } },
  city: { required: true, label: "City or Municipality", validate(value) { return comboboxHasOption(cityList, value) ? "" : "Please choose city or municipality from the list."; } },
  barangay: { required: true, label: "Barangay", validate(value) { return comboboxHasOption(barangayList, value) ? "" : "Please choose barangay from the list."; } },
  zipCode: {
    required: true, label: "ZIP code",
    validate(value) {
      if (!value) return "ZIP code is required.";
      if (!/^\d{4}$/.test(value)) return "Enter a valid 4-digit Philippine ZIP code.";
      return "";
    }
  },
  emergencyName: { required: true, label: "Emergency contact name", validate(value) { return validateName(value, "Emergency contact name"); } },
  relationship: { required: true, label: "Relationship" },
  emergencyMobile: { required: true, label: "Emergency contact number", validate(value) { return validatePhilippineMobile(value, "Emergency contact number"); } },
  studentType: { required: true, label: "Student type" },
  academicYear: { required: true, label: "Academic year" },
  semester: { required: true, label: "Term / Trimester" },
  department: { required: true, label: "College or department" },
  program: { required: true, label: "Program" },
  yearLevel: { required: true, label: "Year level" }
};

const stepFields = {
  1: ["studentId", "firstName", "middleName", "lastName", "birthDate", "sex", "religion", "civilStatus"],
  2: ["email", "mobile", "region", "province", "city", "barangay", "zipCode", "emergencyName", "relationship", "emergencyMobile"],
  3: ["studentType", "academicYear", "semester", "department", "program", "yearLevel"]
};

/* =========================================
   INITIALIZATION & DATA FETCHING
========================================= */

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
  const savedDraft = getSavedDraft();
  draftDecisionPending = Boolean(savedDraft && savedDraft.formData);
  if (draftDecisionPending) {
    const when = new Date(savedDraft.savedAt);
    const stamp = isNaN(when) ? "" : `Last saved ${when.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })} · `;
    document.getElementById("draftMeta").textContent = `${stamp}Step ${Math.min(Number(savedDraft.currentStep) || 1, 4)} of 5`;
  }

  document.querySelectorAll(".form-group input, .form-group select").forEach((f) => setDescribedBy(f, false));
  regionInput.disabled = true;
  regionInput.placeholder = "Loading regions…";

  initCustomCalendar();
  attachEventListeners();
  updateStepUI();

  await fetchAddressData();
  if (draftDecisionPending) openModal(restoreModal);
}

async function fetchAddressData() {
  try {
    const response = await fetch(ADDRESS_DATA_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    phAddressData = await response.json();
    populateRegions(); 
    console.log("Philippine address data loaded successfully.");
  } catch (error) {
    console.error("Failed to load address data:", error);
    regionInput.placeholder = "Address list unavailable";
    document.getElementById("regionError").textContent = "The address list could not be loaded. Check your internet connection, then refresh the page.";
    showNotification("Could not load address data. Please refresh the page.", "error");
  }
}

/* =========================================
   EVENT LISTENERS
========================================= */

function attachEventListeners() {
  document.querySelectorAll(".next-btn").forEach((button) => {
    button.addEventListener("click", handleNextStep);
  });

  document.querySelectorAll(".prev-btn").forEach((button) => {
    button.addEventListener("click", handlePreviousStep);
  });

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.editStep);
      goToStep(step);
    });
  });

  progressSteps.forEach((step) => {
    const go = () => {
      const n = Number(step.dataset.step);
      if (currentStep < 5 && n < currentStep) goToStep(n);
    };
    step.addEventListener("click", go);
    step.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
    });
  });

  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox" && !e.defaultPrevented && currentStep <= 3) {
      e.preventDefault();
      handleNextStep();
    }
  });

  setupCombobox(regionInput, regionList, handleRegionSelection);
  setupCombobox(provinceInput, provinceList, handleProvinceSelection);
  setupCombobox(cityInput, cityList, handleCitySelection);
  setupCombobox(barangayInput, barangayList, () => validateField("barangay"));

  form.addEventListener("input", handleFormInput);
  form.addEventListener("change", handleFormInput);
  
  departmentSelect.addEventListener("change", handleDepartmentChange);
  confirmationCheck.addEventListener("change", handleConfirmationChange);
  
  // Allow Enter key to toggle the confirmation checkbox
  confirmationCheck.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); 
      confirmationCheck.checked = !confirmationCheck.checked;
      confirmationCheck.dispatchEvent(new Event("change"));
    }
  });

  form.addEventListener("submit", handleSubmit);

  saveExitBtn.addEventListener("click", () => {
    saveDraft();
    showNotification("Your enrollment draft has been saved.", "success");
  });

  restoreDraftBtn.addEventListener("click", restoreSavedDraft);
  document.getElementById("openGuideBtn").addEventListener("click", () => openModal(guideModal));

  discardDraftBtn.addEventListener("click", () => {
    closeModal(restoreModal);
    openModal(clearModal);
  });

  confirmClearBtn.addEventListener("click", clearAndResetForm);

  newEnrollmentBtn.addEventListener("click", () => {
    openModal(clearModal);
  });

  copyReferenceBtn.addEventListener("click", copyReferenceNumber);
  printBtn.addEventListener("click", () => window.print());

  document.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", () => {
      const modalId = element.dataset.closeModal;
      const modal = document.getElementById(modalId);
      closeModal(modal);
    });
  });

  document.addEventListener("keydown", handleKeyboardEvents);

  window.addEventListener("beforeunload", () => {
    if (currentStep < 5) saveDraft(false);
  });
}

/* =========================================
   CUSTOM CALENDAR LOGIC
========================================= */

function initCustomCalendar() {
  const currentYear = new Date().getFullYear();
  for (let i = currentYear; i >= 1900; i--) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    calYearSelect.appendChild(opt);
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  months.forEach((m, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = m;
    calMonthSelect.appendChild(opt);
  });

  calTriggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    customCalendar.classList.toggle("open");
    calTriggerBtn.setAttribute("aria-expanded", String(customCalendar.classList.contains("open")));
    if (customCalendar.classList.contains("open")) {
      if (birthDateInput.value && birthDateInput.value.length === 10) {
        const parts = birthDateInput.value.split('/');
        if (parts.length === 3) {
          calendarDate = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      } else {
        calendarDate = new Date();
      }
      calendarDate.setDate(1); 
      if (calendarDate.getFullYear() < 1900) calendarDate.setFullYear(1900);
      syncSelectors();
      renderCalendar();
      (calDaysContainer.querySelector(".selected") || calDaysContainer.querySelector(".today") || calDaysContainer.querySelector("button.cal-day"))?.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (!customCalendar.contains(e.target) && e.target !== calTriggerBtn && e.target !== birthDateInput) {
      closeCalendar(false);
    }
  });

  customCalendar.addEventListener("focusout", (e) => {
    if (e.relatedTarget && !customCalendar.contains(e.relatedTarget) && e.relatedTarget !== calTriggerBtn) closeCalendar(false);
  });

  calDaysContainer.addEventListener("keydown", (e) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    const btn = e.target.closest("button[data-date]");
    if (!delta || !btn) return;
    e.preventDefault();
    const [y, m, d] = btn.dataset.date.split("-").map(Number);
    const t = new Date(y, m - 1, d + delta);
    if (t.getFullYear() < 1900) return;
    calendarDate = new Date(t.getFullYear(), t.getMonth(), 1);
    syncSelectors();
    renderCalendar();
    const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    calDaysContainer.querySelector(`[data-date="${key}"]`)?.focus();
  });

  calPrevMonth.addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    syncSelectors();
    renderCalendar();
  });

  calNextMonth.addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    syncSelectors();
    renderCalendar();
  });

  calMonthSelect.addEventListener("change", () => {
    calendarDate.setMonth(parseInt(calMonthSelect.value));
    renderCalendar();
  });

  calYearSelect.addEventListener("change", () => {
    calendarDate.setFullYear(parseInt(calYearSelect.value));
    renderCalendar();
  });
}

function syncSelectors() {
  calMonthSelect.value = calendarDate.getMonth();
  calYearSelect.value = calendarDate.getFullYear();
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  let html = "";

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  dayNames.forEach(day => {
    html += `<div class="cal-day-label">${day}</div>`;
  });

  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day outside" aria-hidden="true">${daysInPrevMonth - i}</div>`;
  }

  const today = new Date();
  let existingDateStr = "";
  if (birthDateInput.value && birthDateInput.value.length === 10 && birthDateInput.value.split('/').length === 3) {
    const parts = birthDateInput.value.split('/');
    existingDateStr = `${parts[2]}-${String(parts[0]).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}`;
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    
    let classes = "cal-day";
    
    if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      classes += " today";
    }
    
    if (currentDateStr === existingDateStr) {
      classes += " selected";
    }

    const label = new Date(year, month, i).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const state = (classes.includes("selected") ? ' aria-pressed="true"' : ' aria-pressed="false"') + (classes.includes("today") ? ' aria-current="date"' : "");
    const tabIndex = classes.includes("selected") || (i === 1 && !existingDateStr) ? "0" : "-1";

    html += `<button type="button" class="${classes}" data-date="${currentDateStr}" aria-label="${label}" tabindex="${tabIndex}"${state}>${i}</button>`;
  }

  const totalCells = firstDay + daysInMonth;
  const nextMonthDays = 42 - totalCells;
  
  for (let i = 1; i <= nextMonthDays; i++) {
    html += `<div class="cal-day outside" aria-hidden="true">${i}</div>`;
  }

  calDaysContainer.innerHTML = html;

  document.querySelectorAll(".cal-day:not(.outside)").forEach(dayEl => {
    dayEl.addEventListener("click", () => {
      const dateStr = dayEl.getAttribute("data-date");
      const [y, m, d] = dateStr.split("-");
      selectDate(new Date(y, m - 1, d));
    });
  });
}

function selectDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  birthDateInput.value = `${month}/${day}/${year}`;
  delete birthDateInput.dataset.prevLength;
  
  validateField("birthDate");
  scheduleAutoSave();
  
  closeCalendar(true);
}

function closeCalendar(returnFocus) {
  customCalendar.classList.remove("open");
  calTriggerBtn.setAttribute("aria-expanded", "false");
  if (returnFocus) calTriggerBtn.focus();
}

/* =========================================
   CUSTOM COMBOBOX LOGIC (KEYBOARD ACCESSIBLE)
========================================= */
function setupCombobox(input, list, onSelectCallback) {
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", list.id);
  list.setAttribute("aria-label", `${input.name} suggestions`);

  const clearBtn = document.querySelector(`.combobox-clear[data-target="${input.id}"]`);

  const toggleClearBtn = () => {
    if (clearBtn) clearBtn.hidden = !input.value.trim();
  };

  const closeList = () => {
    list.classList.remove("show");
    list.querySelectorAll("li").forEach(li => {
      li.removeAttribute("tabindex");
      li.classList.remove("active");
    });
  };

  input.addEventListener("focus", () => {
    if (!input.disabled) {
      list.classList.add("show");
      filterList(input, list);
    }
    toggleClearBtn();
  });

  input.addEventListener("input", () => {
    if (!input.disabled) {
      list.classList.add("show");
      filterList(input, list);
    }
    toggleClearBtn();
  });

  // Clear button logic
  if (clearBtn) {
    clearBtn.addEventListener("mousedown", (e) => {
      e.preventDefault(); 
      input.value = "";
      toggleClearBtn();
      input.focus();
      onSelectCallback(); 
      list.classList.add("show");
      filterList(input, list);
      validateField(input.id);
    });
  }

  input.addEventListener("keydown", (e) => {
    const items = [...list.querySelectorAll("li")].filter(li => li.style.display !== "none");
    const activeItem = items.find(li => li.classList.contains("active"));

    if (e.key === "Enter") {
      e.preventDefault(); 
      if (activeItem) {
        input.value = activeItem.textContent;
        closeList();
        onSelectCallback();
      } else {
        snapToOption(input, list);
        closeList();
        onSelectCallback();
      }
      toggleClearBtn();
      return;
    }

    if (e.key === "Tab" && !e.shiftKey && list.classList.contains("show") && items.length > 0) {
      e.preventDefault();
      items.forEach((li, index) => {
        li.setAttribute("tabindex", index === 0 ? "0" : "-1");
      });
      items[0].focus();
      items[0].classList.add("active");
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!list.classList.contains("show")) {
        list.classList.add("show");
        filterList(input, list);
      }
      if (!items.length) return;
      
      e.preventDefault();
      let activeIndex = items.findIndex(li => li.classList.contains("active"));
      if (e.key === "ArrowDown") activeIndex = (activeIndex + 1) % items.length;
      if (e.key === "ArrowUp") activeIndex = (activeIndex - 1 + items.length) % items.length;
      
      items.forEach(li => li.classList.remove("active"));
      items[activeIndex].classList.add("active");
      items[activeIndex].scrollIntoView({ block: "nearest" });
    }

    if (e.key === "Escape") {
      closeList();
    }
  });

  list.addEventListener("keydown", (e) => {
    const items = [...list.querySelectorAll("li")].filter(li => li.style.display !== "none");
    let activeIndex = items.findIndex(li => li.classList.contains("active"));

    if (e.key === "Tab") {
      if (e.shiftKey && activeIndex === 0) {
        e.preventDefault();
        items[0].removeAttribute("tabindex");
        items[0].classList.remove("active");
        input.focus();
      } else if (!e.shiftKey && activeIndex === items.length - 1) {
        closeList();
      } else {
        e.preventDefault();
        const nextIndex = e.shiftKey ? activeIndex - 1 : activeIndex + 1;
        if (items[nextIndex]) {
          items.forEach(li => li.removeAttribute("tabindex"));
          items.forEach(li => li.classList.remove("active"));
          items[nextIndex].setAttribute("tabindex", "0");
          items[nextIndex].classList.add("active");
          items[nextIndex].focus();
        }
      }
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (items[activeIndex]) {
        input.value = items[activeIndex].textContent;
        closeList();
        onSelectCallback();
        input.focus();
        toggleClearBtn();
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      closeList();
      input.focus();
    }
  });

  input.addEventListener("blur", (e) => {
    if (!e.relatedTarget || !list.contains(e.relatedTarget)) {
      setTimeout(() => {
        if (document.activeElement !== input && !list.contains(document.activeElement)) {
          closeList();
          snapToOption(input, list);
          if (input.id) validateField(input.id);
          onSelectCallback();
          toggleClearBtn();
        }
      }, 150);
    }
  });

  list.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "LI") {
      e.preventDefault(); 
      input.value = e.target.textContent;
      closeList();
      onSelectCallback();
      input.focus();
      toggleClearBtn();
    }
  });
}

function setActiveItem(items, index) {
  items.forEach(li => li.classList.remove("active"));
  items[index].classList.add("active");
  items[index].scrollIntoView({ block: "nearest" });
}

function filterList(input, list) {
  const filter = input.value.toLowerCase();
  const items = list.querySelectorAll("li");
  let hasVisible = false;

  items.forEach(li => {
    const text = li.textContent.toLowerCase();
    li.setAttribute("tabindex", "-1"); 
    
    if (text.includes(filter)) {
      li.style.display = "";
      hasVisible = true;
    } else {
      li.style.display = "none";
    }
  });

  list.classList.toggle("show", hasVisible);
}

/* =========================================
   DYNAMIC ADDRESS POPULATION (CASCADING)
========================================= */

function populateRegions() {
  regionList.innerHTML = "";
  
  if (phAddressData) {
    const regionsArray = Object.keys(phAddressData).map(regionCode => {
      const rawName = phAddressData[regionCode].region_name;
      const displayName = regionDisplayNames[rawName] || rawName;
      return { code: regionCode, name: displayName };
    });

    regionsArray.sort((a, b) => a.name.localeCompare(b.name));

    regionsArray.forEach(region => {
      const li = document.createElement("li");
      li.textContent = region.name; li.setAttribute("role", "option");
      regionList.appendChild(li);
    });
    
    regionInput.disabled = false;
    regionInput.placeholder = "Type or select Region";
  } else {
    regionInput.disabled = true;
  }
}

function handleRegionSelection() {
  const val = regionInput.value;
  let matchedCode = null;

  if (phAddressData) {
    for (const code of Object.keys(phAddressData)) {
      const rawName = phAddressData[code].region_name;
      const displayName = regionDisplayNames[rawName] || rawName;
      if (displayName === val) {
        matchedCode = code;
        break;
      }
    }
  }

  if (matchedCode) {
    if (regionInput.dataset.resolved === val) return;
    regionInput.dataset.resolved = val;
    populateProvinces(matchedCode);
    validateField("region");
    provinceInput.disabled = false; 
  } else {
    delete regionInput.dataset.resolved;
    provinceInput.value = ""; provinceInput.disabled = true; provinceList.innerHTML = "";
    cityInput.value = ""; cityInput.disabled = true; cityList.innerHTML = "";
    barangayInput.value = ""; barangayInput.disabled = true; barangayList.innerHTML = "";
    const pClear = document.querySelector('.combobox-clear[data-target="province"]');
    const cClear = document.querySelector('.combobox-clear[data-target="city"]');
    const bClear = document.querySelector('.combobox-clear[data-target="barangay"]');
    if(pClear) pClear.hidden = true;
    if(cClear) cClear.hidden = true;
    if(bClear) bClear.hidden = true;
  }
}

function populateProvinces(regionCode) {
  provinceList.innerHTML = "";
  provinceInput.value = ""; delete provinceInput.dataset.resolved; delete cityInput.dataset.resolved;
  cityInput.value = ""; cityInput.disabled = true; cityList.innerHTML = "";
  barangayInput.value = ""; barangayInput.disabled = true; barangayList.innerHTML = "";
  
  const pClear = document.querySelector('.combobox-clear[data-target="province"]');
  const cClear = document.querySelector('.combobox-clear[data-target="city"]');
  const bClear = document.querySelector('.combobox-clear[data-target="barangay"]');
  if(pClear) pClear.hidden = true;
  if(cClear) cClear.hidden = true;
  if(bClear) bClear.hidden = true;

  if (regionCode && phAddressData[regionCode] && phAddressData[regionCode].province_list) {
    const provinces = Object.keys(phAddressData[regionCode].province_list).sort();
    
    provinces.forEach(province => {
      const li = document.createElement("li");
      li.textContent = province; li.setAttribute("role", "option");
      provinceList.appendChild(li);
    });
  }
}

function handleProvinceSelection() {
  const val = provinceInput.value;
  const regionVal = regionInput.value;
  let matchedRegionCode = null;

  if (phAddressData) {
    for (const code of Object.keys(phAddressData)) {
      const rawName = phAddressData[code].region_name;
      const displayName = regionDisplayNames[rawName] || rawName;
      if (displayName === regionVal) { matchedRegionCode = code; break; }
    }
  }

  if (matchedRegionCode && val && phAddressData[matchedRegionCode].province_list[val]) {
    if (provinceInput.dataset.resolved === val) return;
    provinceInput.dataset.resolved = val;
    populateCities(matchedRegionCode, val);
    validateField("province");
    cityInput.disabled = false;
  } else {
    cityInput.value = ""; cityInput.disabled = true; cityList.innerHTML = "";
    barangayInput.value = ""; barangayInput.disabled = true; barangayList.innerHTML = "";
    
    const cClear = document.querySelector('.combobox-clear[data-target="city"]');
    const bClear = document.querySelector('.combobox-clear[data-target="barangay"]');
    if(cClear) cClear.hidden = true;
    if(bClear) bClear.hidden = true;
  }
}

function populateCities(regionCode, province) {
  cityList.innerHTML = "";
  cityInput.value = ""; delete cityInput.dataset.resolved;
  barangayInput.value = ""; barangayInput.disabled = true; barangayList.innerHTML = "";
  
  const cClear = document.querySelector('.combobox-clear[data-target="city"]');
  const bClear = document.querySelector('.combobox-clear[data-target="barangay"]');
  if(cClear) cClear.hidden = true;
  if(bClear) bClear.hidden = true;

  if (regionCode && province && phAddressData[regionCode].province_list[province]) {
    const cities = Object.keys(phAddressData[regionCode].province_list[province].municipality_list).sort();
    
    cities.forEach(city => {
      const li = document.createElement("li");
      li.textContent = city; li.setAttribute("role", "option");
      cityList.appendChild(li);
    });
  }
}

function handleCitySelection() {
  const val = cityInput.value;
  const regionVal = regionInput.value;
  const provinceVal = provinceInput.value;
  let matchedRegionCode = null;

  if (phAddressData) {
    for (const code of Object.keys(phAddressData)) {
      const rawName = phAddressData[code].region_name;
      const displayName = regionDisplayNames[rawName] || rawName;
      if (displayName === regionVal) { matchedRegionCode = code; break; }
    }
  }

  if (matchedRegionCode && provinceVal && val && phAddressData[matchedRegionCode].province_list[provinceVal].municipality_list[val]) {
    if (cityInput.dataset.resolved === val) return;
    cityInput.dataset.resolved = val;
    populateBarangays(matchedRegionCode, provinceVal, val);
    validateField("city");
    barangayInput.disabled = false;
  } else {
    barangayInput.value = ""; barangayInput.disabled = true; barangayList.innerHTML = "";
    const bClear = document.querySelector('.combobox-clear[data-target="barangay"]');
    if(bClear) bClear.hidden = true;
  }
}

function populateBarangays(regionCode, province, city) {
  barangayList.innerHTML = "";

  if (regionCode && province && city && phAddressData[regionCode].province_list[province].municipality_list[city]) {
    const barangays = phAddressData[regionCode].province_list[province].municipality_list[city].barangay_list.sort();
    
    barangays.forEach(barangay => {
      const li = document.createElement("li");
      li.textContent = barangay; li.setAttribute("role", "option");
      barangayList.appendChild(li);
    });
  }
}

/* =========================================
   STEP NAVIGATION & VALIDATION
========================================= */

function handleNextStep() {
  if (currentStep <= 3) {
    const valid = validateStep(currentStep);
    if (!valid) {
      showNotification("Please correct the highlighted fields before continuing.", "error");
      focusFirstInvalidField();
      return;
    }
  }
  if (currentStep === 3) populateReview();
  goToStep(currentStep + 1);
}

function handlePreviousStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

function goToStep(step) {
  if (step < 1 || step > 5) return;
  currentStep = step;
  updateStepUI();

  if (currentStep === 4) populateReview();
  saveDraft(false);

  window.scrollTo({ top: 0, behavior: "smooth" });

  setTimeout(() => {
    const activeStep = document.querySelector(`.form-step[data-form-step="${currentStep}"]`);
    const heading = activeStep?.querySelector("h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }, 250);
}

function updateStepUI() {
  formSteps.forEach((step) => {
    const stepNumber = Number(step.dataset.formStep);
    step.classList.toggle("active", stepNumber === currentStep);
  });

  progressSteps.forEach((step) => {
    const stepNumber = Number(step.dataset.step);
    step.classList.remove("active", "completed");
    const stepName = step.querySelector(".step-label")?.textContent || "";
    if (stepNumber < currentStep && currentStep < 5) {
      step.setAttribute("tabindex", "0"); step.setAttribute("role", "button"); step.setAttribute("aria-label", `Go back to ${stepName}`);
    } else {
      step.removeAttribute("tabindex"); step.removeAttribute("role"); step.removeAttribute("aria-label");
    }
    if (stepNumber === currentStep) step.setAttribute("aria-current", "step"); else step.removeAttribute("aria-current");

    if (stepNumber < currentStep) {
      step.classList.add("completed");
      const circle = step.querySelector(".step-circle");
      if (circle) circle.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-check"/></svg>';
    } else if (stepNumber === currentStep) {
      step.classList.add("active");
      const circle = step.querySelector(".step-circle");
      if (circle) circle.textContent = stepNumber;
    } else {
      const circle = step.querySelector(".step-circle");
      if (circle) circle.textContent = stepNumber;
    }
  });

  const percent = ((currentStep - 1) / 4) * 100;
  const currentName = progressSteps[currentStep - 1]?.querySelector(".step-label")?.textContent || "";
  progressText.textContent = `Step ${currentStep} of 5: ${currentName}`;
  progressBar.setAttribute("aria-valuetext", `Step ${currentStep} of 5, ${currentName}`);
  progressPercent.textContent = `${percent}% complete`;
  progressFill.style.width = `${percent}%`;
  progressBar.setAttribute("aria-valuenow", String(currentStep));
  saveExitBtn.style.display = currentStep === 5 ? "none" : "inline-flex";
  autoSaveIndicator.hidden = currentStep === 5;
}

function validateStep(stepNumber) {
  let valid = true;
  const fields = stepFields[stepNumber] || [];
  fields.forEach((fieldId) => {
    if (!validateField(fieldId)) valid = false;
  });
  return valid;
}

function validateField(fieldId) {
  const field = document.getElementById(fieldId);
  const rule = validationRules[fieldId];
  if (!field || !rule) return true;

  const value = field.value.trim();
  let error = "";

  if (rule.required && !value) {
    error = `${rule.label} is required.`;
  } else if (rule.validate) {
    error = rule.validate(value);
  }

  setFieldError(field, error);
  return !error;
}

function comboboxHasOption(list, value) {
  const v = value.trim().toLowerCase();
  return [...list.children].some((li) => li.textContent.toLowerCase() === v);
}

function snapToOption(input, list) {
  const v = input.value.trim().toLowerCase();
  const match = [...list.children].find((li) => li.textContent.toLowerCase() === v);
  if (match) input.value = match.textContent;
}

function setDescribedBy(field, withError) {
  const helper = field.closest(".form-group")?.querySelector(".helper-text");
  if (helper && !helper.id) helper.id = `${field.id}Help`;
  const ids = [helper?.id, withError ? `${field.id}Error` : ""].filter(Boolean);
  if (ids.length) field.setAttribute("aria-describedby", ids.join(" "));
  else field.removeAttribute("aria-describedby");
}

function setFieldError(field, message) {
  const errorElement = document.getElementById(`${field.id}Error`);
  if (message) {
    field.classList.add("input-error");
    field.setAttribute("aria-invalid", "true");
    if (errorElement) {
      errorElement.textContent = message;
      setDescribedBy(field, true);
    }
  } else {
    field.classList.remove("input-error");
    field.removeAttribute("aria-invalid");
    if (errorElement) {
      errorElement.textContent = "";
      setDescribedBy(field, false);
    }
  }
}

function validateName(value, label) {
  if (!value) return `${label} is required.`;
  const namePattern = /^[A-Za-zÀ-ÖØ-öø-ÿÑñ.' -]+$/;
  if (!namePattern.test(value)) return `${label} contains unsupported characters.`;
  if (value.length < 2) return `${label} must contain at least 2 characters.`;
  return "";
}

function validatePhilippineMobile(value, label) {
  if (!value) return `${label} is required.`;
  const digits = value.replace(/\D/g, "");
  if (!/^9\d{9}$/.test(digits)) return `Enter a valid 10-digit Philippine mobile number beginning with 9.`;
  return "";
}

function focusFirstInvalidField() {
  const activeStep = document.querySelector(`.form-step[data-form-step="${currentStep}"]`);
  if (!activeStep) return;

  const invalidField = activeStep.querySelector('[aria-invalid="true"]');
  if (invalidField) {
    invalidField.focus();
    invalidField.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
}

function handleFormInput(event) {
  const target = event.target;
  
  // Auto-capitalize text inputs
  if (target.tagName === "INPUT" && target.type === "text") {
    const noCapitalize = ["studentId", "email", "mobile", "emergencyMobile", "zipCode", "birthDate"];
    
    if (!noCapitalize.includes(target.id)) {
      const start = target.selectionStart;
      const end = target.selectionEnd;

      target.value = target.value.replace(/\b\w/g, char => char.toUpperCase());
      target.setSelectionRange(start, end);
    }
  }

  // ==========================================
  // CURSOR-AWARE DATE INPUT MASK
  // ==========================================
  if (target.id === "birthDate") {
    // 1. Get current cursor position and raw digits
    let cursorPos = target.selectionStart;
    let rawDigits = target.value.replace(/\D/g, "");
    
    // 2. Build the formatted string
    let formatted = "";
    if (rawDigits.length > 0) {
      formatted = rawDigits.slice(0, 2);
    }
    if (rawDigits.length > 2) {
      formatted += "/" + rawDigits.slice(2, 4);
    }
    if (rawDigits.length > 4) {
      formatted += "/" + rawDigits.slice(4, 8);
    }
    
    // 3. If the value changed, update it and calculate the new cursor position
    if (target.value !== formatted) {
      target.value = formatted;
      
      // Count how many numbers are before the cursor
      let digitsBeforeCursor = target.value.slice(0, cursorPos).replace(/\D/g, "").length;
      
      // Find the new index where the cursor should sit (after the same number of digits)
      let newCursorPos = 0;
      let digitsFound = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitsFound++;
        }
        if (digitsFound === digitsBeforeCursor) {
          newCursorPos = i + 1;
          break;
        }
      }
      
      // Fallback if cursor is at the very end
      if (digitsBeforeCursor === 0) newCursorPos = 0;
      if (digitsBeforeCursor === rawDigits.length) newCursorPos = formatted.length;

      // 4. Restore the cursor
      target.setSelectionRange(newCursorPos, newCursorPos);
    }
  }

  // Clean spaces from Student ID input as user types
  if (target.id === "studentId") {
    target.value = target.value.replace(/\s/g, "").replace(/\D/g, "").slice(0, 7);
  }

  // Live validation
  if (target.id && validationRules[target.id] && (target.classList.contains("input-error") || target.value.trim())) {
    validateField(target.id);
  }
  
  // Phone number formatting
  if (target.id === "mobile" || target.id === "emergencyMobile") {
    let input = target;
    let value = input.value;

    // If they type a 0 at the very beginning, wipe it instantly so they can type 9...
    if (value.startsWith("0")) {
      value = value.substring(1);
      input.value = value;
    }
    
    let selectionStart = input.selectionStart;
    let oldLength = value.length;
    let rawValue = value.replace(/\D/g, '').slice(0, 10);

    let formattedValue = rawValue;
    if (rawValue.length > 3 && rawValue.length <= 6) {
      formattedValue = `${rawValue.slice(0, 3)} ${rawValue.slice(3)}`;
    } else if (rawValue.length > 6) {
      formattedValue = `${rawValue.slice(0, 3)} ${rawValue.slice(3, 6)} ${rawValue.slice(6)}`;
    }

    if (formattedValue !== value) {
      input.value = formattedValue;
      let addedChars = formattedValue.length - oldLength;
      input.setSelectionRange(selectionStart + addedChars, selectionStart + addedChars);
    }
  }
  
  if (target.id === "zipCode") {
    target.value = target.value.replace(/\D/g, "").slice(0, 4);
  }
  
  scheduleAutoSave();
}

/* =========================================
   DYNAMIC PROGRAM SELECTION
========================================= */

function handleDepartmentChange() {
  updateProgramOptions(departmentSelect.value, "");
  validateField("department");
  scheduleAutoSave();
}

function updateProgramOptions(department, selectedProgram = "") {
  programSelect.innerHTML = "";
  if (!department || !programsByDepartment[department]) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Select a department first";
    programSelect.appendChild(option);
    programSelect.disabled = true;
    return;
  }

  programSelect.disabled = false;
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select your program";
  programSelect.appendChild(placeholder);

  programsByDepartment[department].forEach((program) => {
    const option = document.createElement("option");
    option.value = program;
    option.textContent = program;
    programSelect.appendChild(option);
  });

  if (selectedProgram && programsByDepartment[department].includes(selectedProgram)) {
    programSelect.value = selectedProgram;
  }
}

/* =========================================
   REVIEW
========================================= */

function populateReview() {
  const data = getFormData();
  const fullName = [data.firstName, data.middleName, data.lastName, data.suffix].filter(Boolean).join(" ");
  
  const address = [
    data.street, 
    data.barangay, 
    data.city, 
    data.province, 
    data.region, 
    data.zipCode
  ].filter(Boolean).join(", ");

  populateReviewSection("personalReview", [
    ["Full Name", fullName || "—"],
    ["Student ID", data.studentId || "Not provided"],
    ["Date of Birth", data.birthDate || "—"], 
    ["Sex", data.sex || "—"],
    ["Religion", data.religion || "—"],
    ["Civil Status", data.civilStatus || "—"]
  ]);

  populateReviewSection("contactReview", [
    ["Email Address", data.email || "—"],
    ["Mobile Number", data.mobile ? `+63 ${data.mobile}` : "—"],
    ["Home Address", address || "—", true],
    ["Emergency Contact", data.emergencyName || "—"],
    ["Relationship", data.relationship || "—"],
    ["Emergency Number", data.emergencyMobile ? `+63 ${data.emergencyMobile}` : "—"]
  ]);

  populateReviewSection("academicReview", [
    ["Student Type", data.studentType || "—"],
    ["Academic Year", data.academicYear || "—"],
    ["Term / Trimester", data.semester || "—"],
    ["Department", data.department || "—"],
    ["Program", data.program || "—"],
    ["Year Level", data.yearLevel || "—"]
  ]);
}

function populateReviewSection(elementId, items) {
  const container = document.getElementById(elementId);
  container.innerHTML = "";

  items.forEach(([label, value, wide]) => {
    const wrapper = document.createElement("div");
    wrapper.className = wide ? "review-item review-item--wide" : "review-item";
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    wrapper.appendChild(term);
    wrapper.appendChild(description);
    container.appendChild(wrapper);
  });
}

/* =========================================
   CONFIRMATION & SUBMISSION
========================================= */

function handleConfirmationChange() {
  submitBtn.disabled = !confirmationCheck.checked;
  if (confirmationCheck.checked) confirmationError.textContent = "";
}

async function handleSubmit(event) {
  event.preventDefault();
  if (currentStep !== 4) return; 

  const step1Valid = validateStep(1);
  const step2Valid = validateStep(2);
  const step3Valid = validateStep(3);

  if (!step1Valid || !step2Valid || !step3Valid) {
    confirmationCheck.checked = false;
    submitBtn.disabled = true;
    showNotification("Some information needs to be corrected before submission.", "error");

    if (!step1Valid) goToStep(1);
    else if (!step2Valid) goToStep(2);
    else goToStep(3);

    setTimeout(focusFirstInvalidField, 300);
    return;
  }

  if (!confirmationCheck.checked) {
    confirmationError.textContent = "Please confirm that you reviewed your information before submitting.";
    confirmationCheck.focus();
    return;
  }

  setSubmitLoading(true);
  await wait(1400);
  const referenceNumber = generateReferenceNumber();
  completeEnrollment(referenceNumber);
  setSubmitLoading(false);
}

function setSubmitLoading(isLoading) {
  const buttonText = submitBtn.querySelector(".button-text");
  if (isLoading) {
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
    buttonText.textContent = "Submitting Enrollment...";
  } else {
    submitBtn.classList.remove("loading");
    buttonText.textContent = "Submit Enrollment";
  }
}

function completeEnrollment(referenceNumber) {
  const data = getFormData();
  const fullName = [data.firstName, data.middleName, data.lastName, data.suffix].filter(Boolean).join(" ");

  document.getElementById("referenceNumber").textContent = referenceNumber;
  document.getElementById("successStudentName").textContent = fullName;
  document.getElementById("successProgram").textContent = data.program;
  document.getElementById("successAcademicPeriod").textContent = `${data.academicYear} · ${data.semester}`;

  localStorage.removeItem(STORAGE_KEY);
  currentStep = 5;
  updateStepUI();
  window.scrollTo({ top: 0, behavior: "smooth" });
  const doneHeading = document.querySelector('.form-step[data-form-step="5"] h2');
  if (doneHeading) { doneHeading.tabIndex = -1; doneHeading.focus({ preventScroll: true }); }
  showNotification("Enrollment submitted successfully.", "success");
}

/* =========================================
   FORM DATA & RECOVERY
========================================= */

function getFormData() {
  const formData = new FormData(form);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = typeof value === "string" ? value.trim() : value;
  }
  return data;
}

function restoreFormData(data) {
  if (data.department) {
    departmentSelect.value = data.department;
    updateProgramOptions(data.department, data.program || "");
  }

  if (data.region && phAddressData) {
    const regionCode = Object.keys(phAddressData).find((code) => {
      const rawName = phAddressData[code].region_name;
      return (regionDisplayNames[rawName] || rawName) === data.region;
    });

    if (regionCode) {
      regionInput.value = data.region;
      handleRegionSelection();

      if (data.province && phAddressData[regionCode].province_list[data.province]) {
        provinceInput.value = data.province;
        handleProvinceSelection();

        if (data.city && phAddressData[regionCode].province_list[data.province].municipality_list[data.city]) {
          cityInput.value = data.city;
          handleCitySelection();

          if (data.barangay) barangayInput.value = data.barangay;
        }
      }
    }
  }

  Object.entries(data).forEach(([key, value]) => {
    if (["region", "province", "city", "barangay", "department", "program"].includes(key)) return;
    const field = document.querySelector(`[name="${CSS.escape(key)}"]`);
    if (field) {
      field.value = value;
      if (field.id === "birthDate") {
        delete field.dataset.prevLength;
      }
    }
  });
  
  document.querySelectorAll(".combobox-clear").forEach(btn => {
    const targetInput = document.getElementById(btn.dataset.target);
    if (targetInput && targetInput.value.trim()) {
      btn.hidden = false;
    }
  });
}

function setSaveStatus(text, dim = false) {
  autoSaveIndicator.style.opacity = dim ? "0.6" : "1";
  autoSaveIndicator.querySelector("span:last-child").textContent = text;
}

function scheduleAutoSave() {
  clearTimeout(saveTimer);
  setSaveStatus("Saving…", true);
  saveTimer = setTimeout(() => {
    saveDraft(false);
    if (autoSaveIndicator.textContent.includes("Saving")) setSaveStatus("Progress saves automatically");
  }, 800);
}

function saveDraft(showFeedback = true) {
  if (currentStep === 5 || draftDecisionPending) return; 

  const draft = {
    currentStep: Math.min(currentStep, 4),
    savedAt: new Date().toISOString(),
    formData: getFormData()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setSaveStatus(`Saved at ${new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}`);
    if (showFeedback) showNotification("Progress saved.", "success");
  } catch (error) {
    console.error(error);
    if (showFeedback) showNotification("We could not save your progress in this browser.", "error");
  }
}

function getSavedDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function restoreSavedDraft() {
  draftDecisionPending = false;
  const draft = getSavedDraft();
  if (!draft || !draft.formData) {
    closeModal(restoreModal);
    return;
  }

  restoreFormData(draft.formData);
  currentStep = Math.min(Math.max(Number(draft.currentStep) || 1, 1), 4);
  updateStepUI();

  if (currentStep === 4) populateReview();
  closeModal(restoreModal);
  showNotification("Your saved enrollment progress has been restored.", "success");
}

function clearAndResetForm() {
  draftDecisionPending = false;
  [regionInput, provinceInput, cityInput].forEach((i) => delete i.dataset.resolved);
  localStorage.removeItem(STORAGE_KEY);
  form.reset();
  
  delete birthDateInput.dataset.prevLength;

  clearAllErrors();
  updateProgramOptions("", "");
  
  regionInput.value = ""; regionInput.disabled = false;
  provinceInput.value = ""; provinceInput.disabled = true; provinceList.innerHTML = "";
  cityInput.value = ""; cityInput.disabled = true; cityList.innerHTML = "";
  barangayInput.value = ""; barangayInput.disabled = true; barangayList.innerHTML = "";
  
  document.querySelectorAll(".combobox-clear").forEach(btn => btn.hidden = true);
  
  confirmationCheck.checked = false;
  submitBtn.disabled = true;
  currentStep = 1;
  updateStepUI();
  closeModal(clearModal);
  closeModal(restoreModal);
  window.scrollTo({ top: 0, behavior: "smooth" });
  showNotification("A new enrollment form is ready.", "info");
}

function clearAllErrors() {
  document.querySelectorAll(".input-error").forEach((field) => {
    field.classList.remove("input-error");
    field.removeAttribute("aria-invalid");
  });
  document.querySelectorAll(".error-message").forEach((message) => {
    message.textContent = "";
  });
}

/* =========================================
   MODALS & NOTIFICATIONS
========================================= */

function openModal(modal) {
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  const firstButton = modal.querySelector("button");
  setTimeout(() => firstButton?.focus(), 50);
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  lastFocusedElement?.focus?.();
}

function handleKeyboardEvents(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && currentStep < 5 && !draftDecisionPending && !document.querySelector(".modal.open")) {
    event.preventDefault();
    saveDraft(true);
    return;
  }
  if (event.key === "Escape") {
    if (customCalendar.classList.contains("open")) { closeCalendar(true); return; }
    const escModal = document.querySelector(".modal.open");
    if (escModal && !escModal.dataset.persistent) closeModal(escModal);
  }
  const openModalElement = document.querySelector(".modal.open");
  if (openModalElement && event.key === "Tab") trapFocus(event, openModalElement);
}

function trapFocus(event, modal) {
  const focusableElements = modal.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusableElements.length) return;
  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function showNotification(message, type = "info") {
  clearTimeout(notificationTimer);
  notification.textContent = message;
  notification.className = `global-notification ${type} show`;
  notificationTimer = setTimeout(() => {
    notification.classList.remove("show");
  }, type === "error" ? 6500 : 3200);
}

async function copyReferenceNumber() {
  const reference = document.getElementById("referenceNumber").textContent;
  try {
    await navigator.clipboard.writeText(reference);
    showNotification("Reference number copied.", "success");
  } catch (error) {
    console.error(error);
    showNotification(`Reference number: ${reference}`, "info");
  }
}

/* =========================================
   HELPERS
========================================= */

function generateReferenceNumber() {
  const year = new Date().getFullYear();
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `ENR-${year}-${randomNumber}`;
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}