document.addEventListener("DOMContentLoaded", () => {
  const capabilitiesList = document.getElementById("capabilities-list");
  const capabilitySelect = document.getElementById("capability");
  const registerForm = document.getElementById("register-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");
  const practiceFilter = document.getElementById("practice-filter");
  const industryFilter = document.getElementById("industry-filter");
  const availabilityFilter = document.getElementById("availability-filter");
  const sortSelect = document.getElementById("sort-select");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const resultsCount = document.getElementById("results-count");

  let allCapabilities = {};

  // Function to fetch capabilities from API
  async function fetchCapabilities() {
    try {
      const response = await fetch("/capabilities");
      allCapabilities = await response.json();
      
      // Populate the capability select dropdown (no filtering)
      capabilitySelect.innerHTML = '<option value="">-- Select a capability --</option>';
      Object.keys(allCapabilities).forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        capabilitySelect.appendChild(option);
      });

      // Display capabilities with current filters
      displayCapabilities();
    } catch (error) {
      capabilitiesList.innerHTML =
        "<p>Failed to load capabilities. Please try again later.</p>";
      console.error("Error fetching capabilities:", error);
    }
  }

  // Function to filter and sort capabilities
  function filterAndSortCapabilities() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const practiceArea = practiceFilter.value;
    const industry = industryFilter.value;
    const availability = availabilityFilter.value;
    const sortBy = sortSelect.value;

    // Filter capabilities
    let filtered = Object.entries(allCapabilities).filter(([name, details]) => {
      // Search filter
      const matchesSearch = searchTerm === "" ||
        name.toLowerCase().includes(searchTerm) ||
        details.description.toLowerCase().includes(searchTerm);

      // Practice area filter
      const matchesPractice = practiceArea === "" ||
        details.practice_area === practiceArea;

      // Industry filter
      const matchesIndustry = industry === "" ||
        (details.industry_verticals && details.industry_verticals.includes(industry));

      // Availability filter
      let matchesAvailability = true;
      if (availability === "high") {
        matchesAvailability = details.capacity > 30;
      } else if (availability === "medium") {
        matchesAvailability = details.capacity >= 20 && details.capacity <= 30;
      } else if (availability === "low") {
        matchesAvailability = details.capacity < 20;
      }

      return matchesSearch && matchesPractice && matchesIndustry && matchesAvailability;
    });

    // Sort capabilities
    filtered.sort(([nameA, detailsA], [nameB, detailsB]) => {
      switch (sortBy) {
        case "name-asc":
          return nameA.localeCompare(nameB);
        case "name-desc":
          return nameB.localeCompare(nameA);
        case "capacity-desc":
          return detailsB.capacity - detailsA.capacity;
        case "capacity-asc":
          return detailsA.capacity - detailsB.capacity;
        case "consultants-desc":
          return detailsB.consultants.length - detailsA.consultants.length;
        case "consultants-asc":
          return detailsA.consultants.length - detailsB.consultants.length;
        case "practice":
          return detailsA.practice_area.localeCompare(detailsB.practice_area);
        default:
          return 0;
      }
    });

    return filtered;
  }

  // Function to display capabilities
  function displayCapabilities() {
    const filtered = filterAndSortCapabilities();
    
    // Update results count
    resultsCount.textContent = `Showing ${filtered.length} of ${Object.keys(allCapabilities).length} capabilities`;

    // Clear loading message
    capabilitiesList.innerHTML = "";

    if (filtered.length === 0) {
      capabilitiesList.innerHTML = "<p class='no-results'>No capabilities match your filters. Try adjusting your search criteria.</p>";
      return;
    }

    // Populate capabilities list
    filtered.forEach(([name, details]) => {
      const capabilityCard = document.createElement("div");
      capabilityCard.className = "capability-card";

      const availableCapacity = details.capacity || 0;
      const currentConsultants = details.consultants ? details.consultants.length : 0;

      // Create consultants HTML with delete icons
      const consultantsHTML =
        details.consultants && details.consultants.length > 0
          ? `<div class="consultants-section">
            <h5>Registered Consultants:</h5>
            <ul class="consultants-list">
              ${details.consultants
                .map(
                  (email) =>
                    `<li><span class="consultant-email">${email}</span><button class="delete-btn" data-capability="${name}" data-email="${email}">❌</button></li>`
                )
                .join("")}
            </ul>
          </div>`
          : `<p><em>No consultants registered yet</em></p>`;

      capabilityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Practice Area:</strong> ${details.practice_area}</p>
        <p><strong>Industry Verticals:</strong> ${details.industry_verticals ? details.industry_verticals.join(', ') : 'Not specified'}</p>
        <p><strong>Capacity:</strong> ${availableCapacity} hours/week available</p>
        <p><strong>Current Team:</strong> ${currentConsultants} consultants</p>
        <div class="consultants-container">
          ${consultantsHTML}
        </div>
      `;

      capabilitiesList.appendChild(capabilityCard);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const capability = button.getAttribute("data-capability");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(
          capability
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh capabilities list to show updated consultants
        fetchCapabilities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const capability = document.getElementById("capability").value;

    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(
          capability
        )}/register?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        registerForm.reset();

        // Refresh capabilities list to show updated consultants
        fetchCapabilities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to register. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error registering:", error);
    }
  });

  // Event listeners for filters
  searchInput.addEventListener("input", displayCapabilities);
  practiceFilter.addEventListener("change", displayCapabilities);
  industryFilter.addEventListener("change", displayCapabilities);
  availabilityFilter.addEventListener("change", displayCapabilities);
  sortSelect.addEventListener("change", displayCapabilities);

  // Clear filters button
  clearFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    practiceFilter.value = "";
    industryFilter.value = "";
    availabilityFilter.value = "";
    sortSelect.value = "name-asc";
    displayCapabilities();
  });

  // Initialize app
  fetchCapabilities();
});
