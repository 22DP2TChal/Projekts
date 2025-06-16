document.addEventListener("DOMContentLoaded", async () => {
  // ── Navigation elements ───────────────────────────────────────────────
  const navLogo            = document.getElementById("navLogo");
  const navWelcome         = document.getElementById("navWelcome");
  const navLogoutBtn       = document.getElementById("navLogoutBtn");

  // ── Profile elements ─────────────────────────────────────────────────────
  const profileContent     = document.getElementById("profileContent");
  const editProfileWrapper = document.getElementById("editProfileWrapper");
  const editProfileForm    = document.getElementById("editProfileForm");
  const aboutText          = document.getElementById("aboutText");
  const tagsInput          = document.getElementById("tagsInput");
  const editProfileMsg     = document.getElementById("editProfileMessage");

  // ── Reviews section elements ─────────────────────────────────────────────
  const userReviewsSection = document.querySelector(".reviews-section");
  const userReviewsList    = document.getElementById("userReviewsList");
  const leaveReviewWrapper = document.getElementById("leaveReviewWrapper");
  const leaveReviewForm    = document.getElementById("leaveReviewForm");
  const leaveReviewMsg     = document.getElementById("leaveReviewMessage");

  // 1) Extract userId from URL: /users/{id}/profile
  const parts = window.location.pathname.split("/");
  let userId = null;
  for (let i = parts.length - 1; i >= 0; i--) {
    const n = parseInt(parts[i]);
    if (!isNaN(n)) {
      userId = n;
      break;
    }
  }
  if (userId === null) {
    profileContent.innerHTML = "<p>Invalid profile URL.</p>";
    if (userReviewsSection) userReviewsSection.style.display = "none";
    if (editProfileWrapper) editProfileWrapper.style.display = "none";
    return;
  }

  // 2) Get currentUser: if not logged in → redirect
  let currentUser = null;
  try {
    currentUser = await requireAuth();
    navLogoutBtn.style.display = "inline";
    navLogoutBtn.addEventListener("click", logout);
    navWelcome.innerText = `${currentUser.email}`;
    if (navLogo && window.location.pathname.includes("/profile")) {
      navLogo.href = "/projects";
    }
  } catch {
    navLogoutBtn.style.display = "none";
    navWelcome.innerText = "";
  
  }

  function updateNavWelcome() {
  const isNarrow = window.matchMedia("(max-width: 600px)").matches;
  let email = currentUser.email;

  if (isNarrow && email.length > 10) {
    email = email.slice(0, 10) + '…';
  }

  navWelcome.innerText = `${email}`;
}

// При первом рендере
updateNavWelcome();

// И пересчитывать при изменении размера окна
window.matchMedia("(max-width: 600px)").addEventListener('change', updateNavWelcome);
// Также, если пользователь меняет размер окна «вручную», лучше слушать resize:
window.addEventListener('resize', updateNavWelcome);

  // 3) Load user profile: GET /api/users/{userId}
  let targetUser = null;
  try {
    profileContent.innerHTML = "<p>Loading profile…</p>";
    const resp = await fetch(`${API_BASE}/api/users/${userId}`, {
      headers: currentUser ? { "Authorization": `Bearer ${getToken()}` } : {}
    });
    if (!resp.ok) {
      if (resp.status === 404) {
        profileContent.innerHTML = "<p>User not found.</p>";
      } else {
        profileContent.innerHTML = `<p>Error ${resp.status} while loading profile.</p>`;
      }
      if (userReviewsSection) userReviewsSection.style.display = "none";
      if (editProfileWrapper) editProfileWrapper.style.display = "none";
      return;
    }
    targetUser = await resp.json();
    // Render profile data, including tags (array of objects)
    // Convert targetUser.tags: ["Python","FastAPI"] → "Python, FastAPI"
    const tagsArray = Array.isArray(targetUser.tags)
      ? targetUser.tags.map(t => t.name)
      : [];
    const tagsString = tagsArray.join(", ");

    profileContent.innerHTML = `
      <div class="profile-field"><span class="label">ID:</span> ${targetUser.id}</div>
      <div class="profile-field"><span class="label">Email:</span> ${targetUser.email}</div>
      <div class="profile-field"><span class="label">Role:</span> ${targetUser.role}</div>
      <div class="profile-field"><span class="label">Status:</span> ${targetUser.status}</div>
      <div class="profile-field"><span class="label">About:</span> ${(targetUser.about) ? targetUser.about : "<em>– not specified –</em>"}</div>
      <div class="profile-field"><span class="label">Tags:</span> ${(tagsArray.length) ? tagsString : "<em>– no tags –</em>"}</div>
    `;

    // Fill in the "Edit Profile" form fields
    if (aboutText && typeof targetUser.about !== "undefined") {
      aboutText.value = targetUser.about;
    }
    if (tagsInput) {
      tagsInput.value = tagsString; // comma-separated string
    }
  } catch (err) {
    profileContent.innerHTML = `<p>Network error: ${err.message}</p>`;
    if (userReviewsSection) userReviewsSection.style.display = "none";
    if (editProfileWrapper) editProfileWrapper.style.display = "none";
    return;
  }

  // 4) Show edit form only if:
  //    – current user is a freelancer (role === "freelancer")
  //    – and viewing THEIR OWN profile (currentUser.id === userId)
  if (currentUser 
      && currentUser.role === "freelancer" 
      && currentUser.id === userId) {
    if (editProfileWrapper) {
      editProfileWrapper.style.display = "block";
    }
  } else {
    if (editProfileWrapper) {
      editProfileWrapper.style.display = "none";
    }
  }

  // 5) Handle "Edit Profile" form submit
  if (editProfileForm) {
    editProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      editProfileMsg.style.display = "none";

      const newAbout = aboutText.value.trim();
      // Split string "Python, FastAPI" → ["Python","FastAPI"]
      const newTags  = tagsInput.value
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // Prepare body data
      const bodyData = {
        about: newAbout,
        tags:  newTags        // array of strings
      };

      try {
        const resp = await fetch(`${API_BASE}/api/users/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
          },
          body: JSON.stringify(bodyData)
        });
        if (resp.ok) {
          const updated = await resp.json();

          // Update “About” and “Tags” in profileContent
          const fields = profileContent.querySelectorAll(".profile-field");
          // fields[4] — “About”, fields[5] — “Tags”
          if (fields.length >= 6) {
            fields[4].innerHTML = `<span class="label">About:</span> ${(updated.about) ? updated.about : "<em>– not specified –</em>"}`;
            // Convert updated.tags (array of objects {id,name}) to string
            const updatedTagsArr    = Array.isArray(updated.tags) ? updated.tags.map(t => t.name) : [];
            const updatedTagsString = updatedTagsArr.join(", ");
            fields[5].innerHTML = `<span class="label">Tags:</span> ${updatedTagsArr.length ? updatedTagsString : "<em>– no tags –</em>"}`;
          }

          // Update form fields to match server response
          aboutText.value = updated.about || "";
          tagsInput.value = (updated.tags || []).map(t => t.name).join(", ");

          editProfileMsg.className = "message success";
          editProfileMsg.innerText = "Profile successfully updated.";
          editProfileMsg.style.display = "block";
        } else {
          let errMsg = `Error ${resp.status}`;
          const contentType = resp.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await resp.json();
            errMsg = data.detail || JSON.stringify(data);
          }
          editProfileMsg.className = "message error";
          editProfileMsg.innerText = errMsg;
          editProfileMsg.style.display = "block";
        }
      } catch (networkError) {
        editProfileMsg.className = "message error";
        editProfileMsg.innerText = `Network error: ${networkError.message}`;
        editProfileMsg.style.display = "block";
      }
    });
  }

  // 6) Load and render reviews (no changes)
  async function loadAllReviews() {
    userReviewsList.innerHTML = "<p>Loading reviews…</p>";
    try {
      const resp = await fetch(`${API_BASE}/api/users/${userId}/reviews/`, {
        headers: currentUser ? { "Authorization": `Bearer ${getToken()}` } : {}
      });
      if (!resp.ok) {
        if (resp.status === 404) {
          userReviewsList.innerHTML = "<p>User not found. Cannot load reviews.</p>";
        } else {
          userReviewsList.innerHTML = `<p>Error ${resp.status} while loading reviews.</p>`;
        }
        return;
      }
      const reviews = await resp.json();
      if (!reviews.length) {
        userReviewsList.innerHTML = "<p>There are no reviews for this user yet.</p>";
        return;
      }
      userReviewsList.innerHTML = "";
      reviews.forEach(r => {
        const card = document.createElement("div");
        card.className = "review-card";

        const authorLine = document.createElement("p");
        authorLine.innerHTML = `<span class="label">Review from user #${r.reviewer_id}:</span>`;
        card.appendChild(authorLine);

        const ratingLine = document.createElement("p");
        ratingLine.innerHTML = `<span class="label">Rating:</span> ${r.rating}`;
        card.appendChild(ratingLine);

        if (r.comment) {
          const commentLine = document.createElement("p");
          commentLine.innerHTML = `<span class="label">Comment:</span> ${r.comment}`;
          card.appendChild(commentLine);
        }

        const dateLine = document.createElement("small");
        const dt = new Date(r.created_at);
        dateLine.innerText = `Date: ${dt.toLocaleDateString("ru-RU")} ${dt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
        card.appendChild(dateLine);

        userReviewsList.appendChild(card);
      });
    } catch (err) {
      userReviewsList.innerHTML = `<p>Network error while loading reviews: ${err.message}</p>`;
    }
  }

  await loadAllReviews();

  // 7) Logic for "leave a review" form (no changes)
  if (!currentUser) {
    const info = document.createElement("p");
    info.className = "message info";
    info.innerText = "Only registered users can leave reviews.";
    userReviewsList.parentNode.insertBefore(info, leaveReviewWrapper);
    leaveReviewWrapper.style.display = "none";
    return;
  }

  if (currentUser.id === userId || currentUser.role === targetUser.role) {
    leaveReviewWrapper.style.display = "none";
  } else {
    try {
      const respMe = await fetch(`${API_BASE}/api/users/${userId}/reviews/me`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (respMe.ok) {
        const myReview = await respMe.json();
        leaveReviewWrapper.style.display = "none";
        const info = document.createElement("p");
        info.className = "message info";
        info.innerText = `You have already left a review (rating ${myReview.rating}).`;
        userReviewsList.parentNode.insertBefore(info, leaveReviewWrapper);
      } else if (respMe.status === 404) {
        leaveReviewWrapper.style.display = "block";
      } else {
        leaveReviewWrapper.style.display = "none";
        const errInfo = document.createElement("p");
        errInfo.className = "message error";
        errInfo.innerText = "Could not verify review permission.";
        userReviewsList.parentNode.insertBefore(errInfo, leaveReviewWrapper);
      }
    } catch {
      leaveReviewWrapper.style.display = "none";
    }
  }

  if (leaveReviewForm) {
    leaveReviewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      leaveReviewMsg.style.display = "none";

      const rating  = parseInt(document.getElementById("reviewRating").value);
      const comment = document.getElementById("reviewComment").value.trim();

      if (!rating || rating < 1 || rating > 5) {
        leaveReviewMsg.className = "message error";
        leaveReviewMsg.innerText = "Choose rating (from 1 to 5).";
        leaveReviewMsg.style.display = "block";
        return;
      }

      const body = { rating: rating, comment: comment || null };

      try {
        const resp = await fetch(`${API_BASE}/api/users/${userId}/reviews/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
          },
          body: JSON.stringify(body)
        });

        if (resp.status === 201) {
          leaveReviewMsg.className = "message success";
          leaveReviewMsg.innerText = "Thank you for your review!";
          leaveReviewMsg.style.display = "block";
          Array.from(leaveReviewForm.elements).forEach(el => el.disabled = true);
          await loadAllReviews();
        } else {
          let errMsg = `Ошибка: HTTP ${resp.status}`;
          const contentType = resp.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const errJson = await resp.json();
            errMsg = errJson.detail || JSON.stringify(errJson);
          } else {
            const text = await resp.text();
            if (text) errMsg = text;
          }
          leaveReviewMsg.className = "message error";
          leaveReviewMsg.innerText = errMsg;
          leaveReviewMsg.style.display = "block";
        }
      } catch (networkError) {
        leaveReviewMsg.className = "message error";
        leaveReviewMsg.innerText = `Network error: ${networkError.message}`;
        leaveReviewMsg.style.display = "block";
      }
    });
  }
});
