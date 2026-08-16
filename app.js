const cfgOK =
  window.SUPABASE_URL &&
  !window.SUPABASE_URL.startsWith("YOUR_") &&
  window.SUPABASE_ANON_KEY &&
  !window.SUPABASE_ANON_KEY.startsWith("YOUR_");

const sb = cfgOK
  ? window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    )
  : null;

const $ = (s) => document.querySelector(s);

let notes = [];
let editing = null;

/* -------------------------
   Security
------------------------- */

function safe(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

/* -------------------------
   URL Validation
------------------------- */

function driveOK(v) {
  try {
    const u = new URL(v);

    return (
      u.protocol === "https:" &&
      (u.hostname === "drive.google.com" ||
        u.hostname === "docs.google.com")
    );
  } catch {
    return false;
  }
}

function gpOK(v) {
  try {
    const u = new URL(v);

    return (
      u.protocol === "https:" &&
      u.hostname.toLowerCase().includes("gplinks")
    );
  } catch {
    return false;
  }
}

/* -------------------------
   Book Cover System
------------------------- */

function getBookCover(category, subject) {
  const text = `${category} ${subject}`.toLowerCase();

  if (
    text.includes("program") ||
    text.includes("python") ||
    text.includes("javascript") ||
    text.includes("coding")
  ) {
    return {
      icon: "⌨",
      label: "CODE",
      color: "purple"
    };
  }

  if (
    text.includes("database") ||
    text.includes("dbms")
  ) {
    return {
      icon: "▣",
      label: "DATABASE",
      color: "blue"
    };
  }

  if (
    text.includes("network") ||
    text.includes("communication")
  ) {
    return {
      icon: "⌁",
      label: "NETWORK",
      color: "cyan"
    };
  }

  if (
    text.includes("math") ||
    text.includes("calculus")
  ) {
    return {
      icon: "∑",
      label: "MATH",
      color: "orange"
    };
  }

  return {
    icon: "📖",
    label: "NOTES",
    color: "green"
  };
}

/* -------------------------
   Load Notes
------------------------- */

async function loadNotes() {
  if (!sb) {
    notes = [];
    render();
    return;
  }

  const { data, error } = await sb
    .from("notes")
    .select(
      "id,title,subject,semester,category,description,gplink_url"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    alert("Could not load notes. Check Supabase setup/RLS.");
    return;
  }

  notes = data || [];
  render();
}

/* -------------------------
   Render Notes
------------------------- */

function render() {
  const q = $("#search").value.toLowerCase().trim();
  const cat = $("#category").value;

  const list = notes.filter((n) => {
    const matchesCategory =
      !cat || n.category === cat;

    const searchable =
      `${n.title} ${n.subject} ${n.semester} ${n.description}`
        .toLowerCase();

    return matchesCategory && searchable.includes(q);
  });

  $("#total").textContent = notes.length;

  $("#subjects").textContent =
    new Set(
      notes.map((n) =>
        String(n.subject || "").toLowerCase()
      )
    ).size;

  $("#grid").innerHTML = list
    .map((n) => {
      const cover = getBookCover(
        n.category,
        n.subject
      );

      return `
        <article class="card">

          <div class="book-cover ${cover.color}">
            <div class="book-spine"></div>

            <div class="book-content">
              <span class="book-icon">${cover.icon}</span>
              <small>${safe(cover.label)}</small>

              <strong>
                ${safe(n.subject)}
              </strong>

              <div class="book-lines">
                <i></i>
                <i></i>
                <i></i>
              </div>
            </div>
          </div>

          <div class="card-body">

            <span class="tag">
              ${safe(n.category)}
            </span>

            <h3>
              ${safe(n.title)}
            </h3>

            <div class="meta">
              ${safe(n.subject)}
              ${
                n.semester
                  ? " · " + safe(n.semester)
                  : ""
              }
            </div>

            <p class="desc">
              ${safe(
                n.description ||
                  "Study notes and learning material."
              )}
            </p>

            <a
              class="download"
              href="${safe(n.gplink_url)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Open Notes</span>
              <b>↗</b>
            </a>

          </div>

        </article>
      `;
    })
    .join("");

  $("#empty").classList.toggle(
    "hidden",
    list.length > 0
  );
}

/* -------------------------
   Modal
------------------------- */

function modal(show) {
  $("#modal").classList.toggle(
    "hidden",
    !show
  );

  document.body.style.overflow =
    show ? "hidden" : "";
}

function msg(t) {
  $("#authMsg").textContent = t;
}

/* -------------------------
   Authentication
------------------------- */

async function session() {
  if (!sb) return;

  const {
    data: { session }
  } = await sb.auth.getSession();

  if (session) {
    $("#authBox").classList.add("hidden");
    $("#dashboard").classList.remove("hidden");

    loadAdmin();
  } else {
    $("#authBox").classList.remove("hidden");
    $("#dashboard").classList.add("hidden");
  }
}

async function login() {
  if (!sb) {
    msg(
      "First configure config.js with Supabase URL and publishable key."
    );
    return;
  }

  const { error } =
    await sb.auth.signInWithPassword({
      email: $("#email").value.trim(),
      password: $("#password").value
    });

  msg(
    error
      ? error.message
      : "Signed in successfully."
  );

  if (!error) session();
}

/* -------------------------
   Admin Notes
------------------------- */

async function loadAdmin() {
  const { data, error } = await sb
    .from("notes")
    .select(
      "id,title,subject,category,semester,description,drive_url,gplink_url"
    )
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error(error);
    return;
  }

  $("#adminList").innerHTML =
    (data || [])
      .map(
        (n) => `
        <div class="admin-item">

          <div>
            <b>${safe(n.title)}</b>

            <small>
              ${safe(n.subject)}
              ${
                n.semester
                  ? " · " + safe(n.semester)
                  : ""
              }
            </small>
          </div>

          <div class="admin-actions">

            <button
              class="ghost edit"
              data-id="${n.id}"
            >
              Edit
            </button>

            <button
              class="ghost danger del"
              data-id="${n.id}"
            >
              Delete
            </button>

          </div>

        </div>
      `
      )
      .join("") ||
    '<p class="muted">No notes yet.</p>';
}

/* -------------------------
   Save Note
------------------------- */

async function saveNote(e) {
  e.preventDefault();

  if (!sb) return;

  const payload = {
    title: $("#title").value.trim(),
    subject: $("#subject").value.trim(),
    semester: $("#semester").value.trim(),
    category: $("#noteCategory").value,
    description: $("#description").value.trim(),
    drive_url: $("#driveUrl").value.trim(),
    gplink_url: $("#gplinkUrl").value.trim()
  };

  if (!driveOK(payload.drive_url)) {
    alert(
      "Drive URL must be a valid Google Drive/Docs HTTPS URL."
    );
    return;
  }

  if (!gpOK(payload.gplink_url)) {
    alert(
      "GPLinks URL must be a valid HTTPS GPLinks URL."
    );
    return;
  }

  let res;

  if (editing) {
    res = await sb
      .from("notes")
      .update(payload)
      .eq("id", editing);
  } else {
    res = await sb
      .from("notes")
      .insert(payload);
  }

  if (res.error) {
    alert(res.error.message);
    return;
  }

  resetForm();

  await loadNotes();
  await loadAdmin();
}

/* -------------------------
   Reset Form
------------------------- */

function resetForm() {
  editing = null;

  $("#noteForm").reset();

  $("#noteId").value = "";

  $("#saveNote").textContent =
    "Save Note";

  $("#cancelEdit").classList.add(
    "hidden"
  );
}

/* -------------------------
   Admin Actions
------------------------- */

$("#adminList").addEventListener(
  "click",
  async (e) => {
    const id = e.target.dataset.id;

    if (!id) return;

    if (
      e.target.classList.contains("del")
    ) {
      if (
        !confirm(
          "Delete this note?"
        )
      )
        return;

      const { error } = await sb
        .from("notes")
        .delete()
        .eq("id", id);

      if (error) {
        alert(error.message);
        return;
      }

      await loadNotes();
      await loadAdmin();
    }

    if (
      e.target.classList.contains("edit")
    ) {
      const { data, error } =
        await sb
          .from("notes")
          .select("*")
          .eq("id", id)
          .single();

      if (error) {
        alert(error.message);
        return;
      }

      editing = id;

      $("#title").value =
        data.title || "";

      $("#subject").value =
        data.subject || "";

      $("#semester").value =
        data.semester || "";

      $("#description").value =
        data.description || "";

      $("#driveUrl").value =
        data.drive_url || "";

      $("#gplinkUrl").value =
        data.gplink_url || "";

      $("#noteCategory").value =
        data.category || "Other";

      $("#saveNote").textContent =
        "Update Note";

      $("#cancelEdit").classList.remove(
        "hidden"
      );
    }
  }
);

/* -------------------------
   UI Events
------------------------- */

$("#adminBtn").onclick = () => {
  modal(true);
  session();
};

$("#close").onclick = () =>
  modal(false);

$("#login").onclick = login;

$("#logout").onclick = async () => {
  await sb.auth.signOut();
  session();
};

$("#noteForm").onsubmit = saveNote;

$("#cancelEdit").onclick =
  resetForm;

$("#search").oninput = render;

$("#category").onchange = render;

$("#refresh").onclick =
  loadNotes;

/* -------------------------
   Dark Mode
------------------------- */

$("#theme").onclick = () => {
  document.body.classList.toggle(
    "dark"
  );

  localStorage.setItem(
    "nvtheme",
    document.body.classList.contains(
      "dark"
    )
      ? "dark"
      : "light"
  );
};

if (
  localStorage.getItem(
    "nvtheme"
  ) === "dark"
) {
  document.body.classList.add(
    "dark"
  );
}

/* -------------------------
   Init
------------------------- */

$("#year").textContent =
  new Date().getFullYear();

if (sb) {
  sb.auth.onAuthStateChange(() =>
    session()
  );
}

loadNotes();
