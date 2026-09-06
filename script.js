/* =========================================================
   LUMORA - script.js
   ใช้ร่วมกันทุกหน้า: product.html, order.html, admin.html
   Vanilla JavaScript เท่านั้น ไม่ใช้ library ภายนอก
   ========================================================= */

// ตั้งค่า URL ปลายทางไว้ตรงนี้ที่เดียว แก้ไขง่าย
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwtR-xVfuArwGT-apqdY-qOeZT0asqm37a83XbQF52LTlU_igJIDyb7Sj4QqMqOAck23A/exec";
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQieIzUdWNRzEe60PfYamCDub5gcTlrF0tRY18iwoeJZH3EWsuIi4bFB4R6m4SqsB1ro9dSNCaARg9i/pub?gid=0&single=true&output=csv";

document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("product-list")) {
    initProductPage();
  }

  if (document.getElementById("orderForm")) {
    initOrderPage();
  }

  if (document.querySelector("#ordersTable tbody")) {
    initAdminPage();
  }
});

/* =========================================================
   1. product.html
   ========================================================= */
function initProductPage() {
  const productList = document.getElementById("product-list");
  const filterBar = document.getElementById("filter-bar");

  const moodLabels = {
    all: "ทั้งหมด",
    fresh: "Fresh",
    relax: "Relax",
    focus: "Focus",
    romance: "Romance",
  };

  let allProducts = [];

  // อ่าน mood จาก URL parameter ถ้ามี
  const params = new URLSearchParams(window.location.search);
  let currentMood = params.get("mood") || "all";
  if (!moodLabels[currentMood]) {
    currentMood = "all";
  }

  fetch("products.json")
    .then((res) => res.json())
    .then((data) => {
      allProducts = data;
      renderFilterBar();
      renderProducts(currentMood);
    })
    .catch((error) => {
      console.error(error);
      productList.innerHTML = "<p>ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง</p>";
    });

  function renderFilterBar() {
    if (!filterBar) return;
    filterBar.innerHTML = "";

    Object.keys(moodLabels).forEach((moodKey) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-btn";
      btn.textContent = moodLabels[moodKey];
      btn.dataset.mood = moodKey;

      if (moodKey === currentMood) {
        btn.classList.add("active");
      }

      btn.addEventListener("click", function () {
        currentMood = moodKey;

        // อัปเดต URL parameter โดยไม่รีโหลดหน้า
        const url = new URL(window.location.href);
        if (moodKey === "all") {
          url.searchParams.delete("mood");
        } else {
          url.searchParams.set("mood", moodKey);
        }
        window.history.replaceState({}, "", url);

        // อัปเดตปุ่ม active
        const buttons = filterBar.querySelectorAll(".filter-btn");
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        renderProducts(currentMood);
      });

      filterBar.appendChild(btn);
    });
  }

  function renderProducts(mood) {
    productList.innerHTML = "";

    const filtered =
      mood === "all"
        ? allProducts
        : allProducts.filter((p) => p.mood === mood);

    if (filtered.length === 0) {
      productList.innerHTML = "<p>ไม่พบสินค้าในหมวดนี้</p>";
      return;
    }

    filtered.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product-card";

      const img = document.createElement("img");
      img.src = product.image;
      img.alt = product.name;
      card.appendChild(img);

      const name = document.createElement("h3");
      name.textContent = product.name;
      card.appendChild(name);

      const size = document.createElement("p");
      size.className = "product-size";
      size.textContent = "ขนาด " + product.size;
      card.appendChild(size);

      const price = document.createElement("p");
      price.className = "product-price";
      price.textContent = product.price + " บาท";
      card.appendChild(price);

      const orderBtn = document.createElement("a");
      orderBtn.className = "order-btn";
      orderBtn.textContent = "สั่งซื้อ";
      orderBtn.href =
        "order.html?item=" +
        encodeURIComponent(product.name) +
        "&price=" +
        encodeURIComponent(product.price);
      card.appendChild(orderBtn);

      productList.appendChild(card);
    });
  }
}

/* =========================================================
   2. order.html
   ========================================================= */
function initOrderPage() {
  const form = document.getElementById("orderForm");
  const itemsInput = document.getElementById("items");
  const totalInput = document.getElementById("total");
  const customerNameInput = document.getElementById("customerName");
  const contactInput = document.getElementById("contact");
  const noteInput = document.getElementById("note");

  // อ่าน item และ price จาก URL แล้วเติมลงฟอร์มทันที
  const params = new URLSearchParams(window.location.search);
  const item = params.get("item");
  const price = params.get("price");

  if (itemsInput && item) {
    itemsInput.value = item;
  }

  if (totalInput && price) {
    totalInput.value = price;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const payload = {
      customerName: customerNameInput ? customerNameInput.value : "",
      contact: contactInput ? contactInput.value : "",
      items: itemsInput ? itemsInput.value : "",
      total: totalInput ? totalInput.value : "",
      note: noteInput ? noteInput.value : "",
    };

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then(() => {
        window.location.href = "thankyou.html";
      })
      .catch((error) => {
        console.error(error);
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      });
  });
}

/* =========================================================
   3. admin.html
   ========================================================= */
function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");

  fetch(CSV_URL)
    .then((res) => res.text())
    .then((csvText) => {
      const rows = parseCSV(csvText);

      if (rows.length === 0) {
        return;
      }

      // แถวแรกคือ header ตัดออก
      const dataRows = rows.slice(1).filter((r) => r.length > 1 || r[0] !== "");

      // เรียงจากล่าสุดขึ้นก่อน (สมมติแถวใหม่ถูกเพิ่มต่อท้ายไฟล์)
      dataRows.reverse();

      tbody.innerHTML = "";

      dataRows.forEach((row) => {
        const tr = document.createElement("tr");

        // คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการเทียนหอม, จำนวนเงินรวม, หมายเหตุ
        for (let i = 0; i < 6; i++) {
          const td = document.createElement("td");
          td.textContent = row[i] !== undefined ? row[i] : "";
          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      });
    })
    .catch((error) => {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="6">ไม่สามารถโหลดข้อมูลได้</td></tr>';
    });
}

/**
 * Vanilla JS CSV parser
 * รองรับ comma ในข้อมูล และข้อความที่ครอบด้วย double quote (รวมถึง "" ที่แทน " ตัวเดียว และ newline ในเซลล์)
 * คืนค่าเป็น array of array of strings
 */
function parseCSV(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i++; // ข้าม quote ตัวที่สอง
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\r") {
        // ข้าม carriage return, ให้ \n จัดการขึ้นบรรทัดใหม่
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }

  // เพิ่มฟิลด์/แถวสุดท้ายถ้ายังไม่ว่าง
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
