<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RestaurantHoursUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && ($user->hasRole('super_admin') || $user->hasRole('restaurant_owner') || $user->hasRole('restaurant_staff'));
    }

    public function rules(): array
    {
        return [
            'hours' => ['required', 'array'],
            'hours.*.day_of_week' => ['required', 'string', 'in:monday,tuesday,wednesday,thursday,friday,saturday,sunday'],
            'hours.*.is_closed' => ['required', 'boolean'],
            'hours.*.open_time' => ['nullable', 'string', 'regex:/^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
            'hours.*.close_time' => ['nullable', 'string', 'regex:/^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
            'hours.*.open_time_2' => ['nullable', 'string', 'regex:/^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
            'hours.*.close_time_2' => ['nullable', 'string', 'regex:/^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/'],
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $hours = $this->input('hours', []);
            foreach ($hours as $index => $slot) {
                $isClosed = filter_var($slot['is_closed'] ?? false, FILTER_VALIDATE_BOOLEAN);
                $day = $slot['day_of_week'] ?? "day #{$index}";

                if (!$isClosed) {
                    if (empty($slot['open_time']) || empty($slot['close_time'])) {
                        $validator->errors()->add("hours.{$index}.open_time", "Opening and closing times are required for {$day} when not closed.");
                    } elseif ($slot['open_time'] === $slot['close_time']) {
                        $validator->errors()->add("hours.{$index}.close_time", "Closing time cannot be identical to opening time for {$day}.");
                    }

                    // Check split shift validation if provided
                    if (!empty($slot['open_time_2']) || !empty($slot['close_time_2'])) {
                        if (empty($slot['open_time_2']) || empty($slot['close_time_2'])) {
                            $validator->errors()->add("hours.{$index}.open_time_2", "Both start and end times are required for split shift on {$day}.");
                        } elseif ($slot['open_time_2'] === $slot['close_time_2']) {
                            $validator->errors()->add("hours.{$index}.close_time_2", "Split shift closing time cannot be identical to opening time for {$day}.");
                        } elseif (!empty($slot['close_time']) && !empty($slot['open_time']) && $slot['open_time'] < $slot['close_time']) {
                            // Primary shift is standard daytime
                            if ($slot['open_time_2'] <= $slot['close_time']) {
                                $validator->errors()->add("hours.{$index}.open_time_2", "Split shift on {$day} must start after primary shift closes.");
                            }
                        }
                    }
                }
            }
        });
    }
}
