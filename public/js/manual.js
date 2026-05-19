/**
 * public/js/manual.js
 * Logic for the Theory and User Manual:
 * - Real-time math playground calculations.
 * - Sidebar active link highlights on scrolling.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ─── Calculator Logic ───────────────────────────────────────────────────────
  const inputFn = document.getElementById('inputFn');
  const inputAmax = document.getElementById('inputAmax');
  const inputF1 = document.getElementById('inputF1');
  const inputF2 = document.getElementById('inputF2');

  const outAhalf = document.getElementById('outAhalf');
  const outBandwidth = document.getElementById('outBandwidth');
  const outQ = document.getElementById('outQ');
  const outZeta = document.getElementById('outZeta');
  const outStatus = document.getElementById('outStatus');

  function calculateDSP() {
    const fn = parseFloat(inputFn.value);
    const aMax = parseFloat(inputAmax.value);
    const f1 = parseFloat(inputF1.value);
    const f2 = parseFloat(inputF2.value);

    // 1. Validate Numeric Inputs (handles empty or non-numeric entries)
    if (isNaN(fn) || isNaN(aMax) || isNaN(f1) || isNaN(f2)) {
      outAhalf.innerText = 'N/A';
      outBandwidth.innerText = 'N/A';
      outQ.innerText = 'N/A';
      outZeta.innerText = 'N/A';
      outStatus.innerText = 'Enter valid numeric values';
      outStatus.style.color = 'var(--text-secondary)';
      return;
    }

    // 2. Validate Positivity
    if (fn <= 0 || aMax <= 0 || f1 <= 0 || f2 <= 0) {
      outAhalf.innerText = 'N/A';
      outBandwidth.innerText = 'N/A';
      outQ.innerText = 'N/A';
      outZeta.innerText = 'N/A';
      outStatus.innerText = 'Values must be greater than 0';
      outStatus.style.color = 'var(--accent-red)';
      return;
    }

    // 3. Half-Power Amplitude (Safe to compute now)
    const aHalf = aMax * 0.7071;
    outAhalf.innerText = `${aHalf.toFixed(3)} G`;

    // 4. Validate Frequency Bounds (f1 < f2)
    if (f1 >= f2) {
      outBandwidth.innerText = 'Invalid range';
      outQ.innerText = 'N/A';
      outZeta.innerText = 'N/A';
      outStatus.innerText = 'f1 must be less than f2';
      outStatus.style.color = 'var(--accent-red)';
      return;
    }

    // 5. Validate Natural Frequency Position (f1 < fn < f2)
    if (fn <= f1 || fn >= f2) {
      const bandwidth = f2 - f1;
      outBandwidth.innerText = `${bandwidth.toFixed(2)} Hz`;
      outQ.innerText = 'N/A';
      outZeta.innerText = 'N/A';
      outStatus.innerText = 'fn must be between f1 and f2';
      outStatus.style.color = 'var(--accent-red)';
      return;
    }

    // 6. Bandwidth (Safe to compute now)
    const bandwidth = f2 - f1;
    outBandwidth.innerText = `${bandwidth.toFixed(2)} Hz`;

    // 7. Q-Factor
    const qFactor = fn / bandwidth;
    if (!isFinite(qFactor) || qFactor <= 0) {
      outQ.innerText = 'N/A';
      outZeta.innerText = 'N/A';
      outStatus.innerText = 'Invalid Q Factor';
      outStatus.style.color = 'var(--accent-red)';
      return;
    }
    outQ.innerText = qFactor.toFixed(2);

    // 8. Damping Ratio
    const zeta = 1 / (2 * qFactor);
    if (!isFinite(zeta) || zeta < 0) {
      outZeta.innerText = 'N/A';
      outStatus.innerText = 'Invalid Damping';
      outStatus.style.color = 'var(--accent-red)';
      return;
    }
    outZeta.innerText = zeta.toFixed(4);

    // 9. Classification
    let statusText = '';
    let statusColor = '';

    if (zeta < 0.01) {
      statusText = 'Critically Light';
      statusColor = 'var(--accent-red)';
    } else if (zeta >= 0.01 && zeta < 0.05) {
      statusText = 'Low Damping';
      statusColor = 'var(--accent-orange)';
    } else if (zeta >= 0.05 && zeta < 0.15) {
      statusText = 'Moderate Damping';
      statusColor = 'var(--accent-indigo)';
    } else {
      statusText = 'High Damping';
      statusColor = 'var(--accent-green)';
    }

    outStatus.innerText = statusText;
    outStatus.style.color = statusColor;
  }

  // Bind key and change events to calculator inputs
  [inputFn, inputAmax, inputF1, inputF2].forEach(input => {
    input.addEventListener('input', calculateDSP);
  });

  // Run initial calculation on page load
  calculateDSP();

  // PDF Download Button Spinner feedback
  const pdfBtn = document.querySelector('a[href="/api/export/manual/pdf"]');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', function() {
      const originalHTML = this.innerHTML;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
      this.style.pointerEvents = 'none';
      setTimeout(() => {
        this.innerHTML = originalHTML;
        this.style.pointerEvents = 'auto';
      }, 3000);
    });
  }

  // ─── Scroll-spy for Sidebar Links ──────────────────────────────────────────
  const sections = document.querySelectorAll('.doc-section');
  const navLinks = document.querySelectorAll('.nav-links a');

  function scrollSpy() {
    let activeId = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      // Triggers slightly before reaching the top (100px buffer)
      if (window.scrollY >= sectionTop - 100) {
        activeId = section.getAttribute('id');
      }
    });

    if (!activeId && sections.length > 0) {
      activeId = sections[0].getAttribute('id');
    }

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${activeId}`) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', scrollSpy);
  // Run once to initialize
  scrollSpy();
});
