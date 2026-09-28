{{-- The plain-text part of the lead notification: text, so nothing is HTML-escaped. --}}
{!! $alert['intro'] !!}

@foreach ($alert['rows'] as $row)
{!! $row[0] !!}: {!! $row[1] !!}{!! ! empty($row[2]) && $row[2] !== $row[1] ? " <{$row[2]}>" : '' !!}
@endforeach
@if ($alert['adminUrl'])

Open the lead in the admin: {!! $alert['adminUrl'] !!}
@endif
