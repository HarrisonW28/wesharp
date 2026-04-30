<?php

namespace App\Enums;

enum CompanyStatus: string
{
    case Lead = 'lead';
    case TrialBooked = 'trial_booked';
    case TrialCompleted = 'trial_completed';
    case Active = 'active';
    case AtRisk = 'at_risk';
    case Lost = 'lost';
    case DoNotContact = 'do_not_contact';
}
