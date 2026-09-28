{{-- The lead notification (09_MEDIA_AND_EMAIL.md): every value is escaped — the visitor typed most of them. --}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $alert['subject'] }}</title>
</head>
<body style="margin: 0; padding: 24px; background: #f5f5f4; font-family: Arial, Helvetica, sans-serif; color: #1c1917;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 24px;">
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5;">{{ $alert['intro'] }}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.5;">
            @foreach ($alert['rows'] as $row)
                <tr>
                    <th scope="row" style="text-align: left; vertical-align: top; padding: 6px 12px 6px 0; width: 130px; color: #57534e; font-weight: 600;">{{ $row[0] }}</th>
                    <td style="padding: 6px 0; white-space: pre-line; word-break: break-word;">@if (! empty($row[2]))<a href="{{ $row[2] }}" style="color: #1d4ed8;">{{ $row[1] }}</a>@else{{ $row[1] }}@endif</td>
                </tr>
            @endforeach
        </table>
        @if ($alert['adminUrl'])
            <p style="margin: 20px 0 0;">
                <a href="{{ $alert['adminUrl'] }}" style="display: inline-block; padding: 10px 16px; background: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px;">Open the lead in the admin</a>
            </p>
        @endif
    </div>
</body>
</html>
