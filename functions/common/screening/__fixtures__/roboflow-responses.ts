export const acceptedResponse = [
  {
    is_match: true,
    status: 'bicycle_without_selfie',
    reason: 'Bicycle detected and no foreground person detected; distant small people are allowed.',
    bicycle_count: 1,
    foreground_person_count: 0,
    predictions: {
      image: {
        width: 1848,
        height: 4000,
      },
      predictions: [],
    },
    vision_events_status: 'Vision event sent successfully',
  },
]

export const selfieRejectionResponse = [
  {
    is_match: false,
    status: 'reject',
    reason: 'Bicycle detected, but a foreground person/selfie-like person was also detected.',
    bicycle_count: 1,
    foreground_person_count: 3,
    predictions: {
      image: {
        width: 612,
        height: 344,
      },
      predictions: [],
    },
    vision_events_status: 'Vision event sent successfully',
  },
]

export const noBicycleRejectionResponse = [
  {
    is_match: false,
    status: 'reject',
    reason: 'No bicycle detected.',
    bicycle_count: 0,
    foreground_person_count: 0,
    predictions: {
      image: {
        width: null,
        height: null,
      },
      predictions: [],
    },
    vision_events_status: 'Vision event sent successfully',
  },
]
