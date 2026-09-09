# MikroTik RouterOS Script Example
:local scriptName "CheckGateway";
:global lastKnownStatus;

:log info "Running script: $scriptName";

:do {
    :local pingCount [/ping 8.8.8.8 count=3];
    :if ($pingCount > 0) do={
        :if ($lastKnownStatus != "up") do={
            :log warning "Internet gateway is now UP!";
            :set lastKnownStatus "up";
        }
    } else={
        :if ($lastKnownStatus != "down") do={
            :log error "Internet gateway is DOWN!";
            :set lastKnownStatus "down";
        }
    }
} on-error={
    :log error "Failed executing gateway check";
};

# Iterate over all ether interfaces
:foreach iface in=[/interface ethernet find] do={
    :local ifName [/interface ethernet get $iface name];
    :local ifSpeed [/interface ethernet get $iface speed];
    :put "Interface: $ifName speed=$ifSpeed";
}

