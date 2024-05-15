'use strict';

// Select DOM elements
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

////////////////////////////////////////
//WORKOUT ARCHITECTURE

// Base class for workouts
class Workout {
  date = new Date(); // Date of workout
  id = (Date.now() + '').slice(-10); // Unique ID for each workout
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //km
    this.duration = duration; //min
  }

  // Set description based on the workout type and date
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

////////////////
// Running. Child of Workout
class Running extends Workout {
  type = 'running'; // Workout type
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence; // Running cadence
    this.calcPace(); // Calculate pace
    this._setDescription(); // Set description
  }
  calcPace() {
    // Calculate pace (min/km)
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

////////////////
// Cycling. Child of Workout
class Cycling extends Workout {
  type = 'cycling'; // Workout type
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation; // Elevation gain
    this.calcSpeed(); // Calculate speed
    this._setDescription(); // Set description
  }
  calcSpeed() {
    // Calculate speed (km/h)
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// Example workout instances
const run1 = new Running([29, -18], 16, 126, 1567);
const cycle1 = new Cycling([27, 13], 19, 86, 409);
////////////////////////////////////////
//APPLICATION ARCHITECTURE
class App {
  #map; // Map instance
  #mapEvent; // Map event
  #mapZoom = 15; // Map zoom level
  #workouts = []; // Array to store workout objects
  constructor() {
    // get user position
    this._getPosition();
    //event listeners
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    //get data from local storage
    this._getLocalStorage();
  }

  // Get user's geolocation
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Couldn't get your location`);
        }
      );
    }
  }

  // Load the map using the user's coordinates
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoom);

    L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // Show form to input workout details
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // Hide form after submission
  _hideForm() {
    //empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // Toggle visibility of cadence and elevation fields
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Handle new workout submission
  _newWorkout(e) {
    e.preventDefault();

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Validate input data
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Create running object if workout is running
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to positive numbers!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // Create cycling object if workout is cycling
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new workout object to workout array
    this.#workouts.push(workout);

    //hide form and clear input fields
    this._hideForm();

    // Render workout on map and list
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);

    // Save to local storage
    this._setLocalStorage();
  }

  // Render workout marker on the map
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♀️'}${workout.description}`
      )
      .openPopup();
  }

  // Render workout on the list
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
`;
    // Add running-specific details
    if (workout.type === 'running') {
      html += `<div class="workout__details">
  <span class="workout__icon">⚡️</span>
  <span class="workout__value">${workout.pace.toFixed(1)}</span>
  <span class="workout__unit">min/km</span>
</div>
<div class="workout__details">
  <span class="workout__icon">🦶🏼</span>
  <span class="workout__value">${workout.cadence}</span>
  <span class="workout__unit">spm</span>
</div>
</li>`;
    }
    // Add cycling-specific details
    if (workout.type === 'cycling') {
      html += `<div class="workout__details">
  <span class="workout__icon">⚡️</span>
  <span class="workout__value">${workout.speed.toFixed(1)}</span>
  <span class="workout__unit">km/h</span>
    </div>
<div class="workout__details">
  <span class="workout__icon">⛰</span>
  <span class="workout__value">${workout.elevation}</span>
  <span class="workout__unit">m</span>
</div>
  </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  // Move map to the clicked workout
  _moveToPopup(e) {
    // Fix error when clicking on a workout before map loads
    if (!this.#map) return;
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  // Save workouts to local storage
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Get workouts from local storage
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // Reset application
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
// Instantiate the app
const app = new App();
