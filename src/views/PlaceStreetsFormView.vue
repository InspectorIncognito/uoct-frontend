<script setup lang="ts">
import { ref } from "vue";
import CustomInput from "@/components/form/CustomInput.vue";
import CustomButton from "@/components/form/CustomButton.vue";

interface FormData {
  place: string;
  streets: string[];
}

const formData = ref<FormData>({
  place: "",
  streets: [""],
});

const addStreet = () => {
  formData.value.streets.push("");
};

const removeStreet = (index: number) => {
  if (formData.value.streets.length > 1) {
    formData.value.streets.splice(index, 1);
  }
};

const updateStreet = (index: number, value: string) => {
  formData.value.streets[index] = value;
};

const updatePlace = (value: string) => {
  formData.value.place = value;
};

const handleSubmit = () => {
  // Filter out empty streets
  const validStreets = formData.value.streets.filter(
    (street) => street.trim() !== ""
  );

  if (!formData.value.place.trim()) {
    alert("Please enter a place name");
    return;
  }

  if (validStreets.length === 0) {
    alert("Please enter at least one street");
    return;
  }

  const submitData = {
    place: formData.value.place.trim(),
    streets: validStreets,
  };

  console.log("Form submitted:", submitData);
  // TODO: Handle form submission (API call, etc.)
  alert(
    `Form submitted!\nPlace: ${
      submitData.place
    }\nStreets: ${submitData.streets.join(", ")}`
  );
};

const resetForm = () => {
  formData.value = {
    place: "",
    streets: [""],
  };
};
</script>

<template>
  <div class="place-streets-form">
    <div class="form-container">
      <h1 class="form-title">Add Place and Streets</h1>

      <form @submit.prevent="handleSubmit" class="form">
        <!-- Place Input -->
        <div class="form-group">
          <label for="place" class="form-label">Place</label>
          <CustomInput
            type="text"
            name="place"
            placeholder="Enter place name"
            :value="formData.place"
            @input="updatePlace"
          />
        </div>

        <!-- Streets Section -->
        <div class="form-group">
          <div class="streets-header">
            <label class="form-label">Streets</label>
            <CustomButton
              type="button"
              text="+ Add Street"
              :method="addStreet"
            />
          </div>

          <div class="streets-list">
            <div
              v-for="(street, index) in formData.streets"
              :key="index"
              class="street-item"
            >
              <CustomInput
                type="text"
                :name="`street-${index}`"
                placeholder="Enter street name"
                :value="street"
                @input="(value) => updateStreet(index, value)"
              />
              <button
                v-if="formData.streets.length > 1"
                type="button"
                class="remove-street-btn"
                @click="removeStreet(index)"
                title="Remove street"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <CustomButton type="button" text="Reset" :method="resetForm" />
          <CustomButton type="submit" text="Submit" />
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.place-streets-form {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.form-container {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
  margin-top: 20px;
}

.form-title {
  color: #31304d;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 32px;
  text-align: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  color: #31304d;
  font-weight: 500;
  font-size: 16px;
}

.streets-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.streets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.street-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.remove-street-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  flex-shrink: 0;
}

.remove-street-btn:hover {
  background: #c82333;
}

.form-actions {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.form-actions > * {
  flex: 1;
}

/* Responsive design */
@media (max-width: 768px) {
  .place-streets-form {
    padding: 12px;
  }

  .form-container {
    padding: 24px;
  }

  .form-title {
    font-size: 24px;
  }

  .streets-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
