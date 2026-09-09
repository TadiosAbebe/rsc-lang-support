# Badly formatted file
/interface   bridge
add     name = "bridge1"    comment = "My Bridge"

/ip   firewall   filter
add action = accept \
chain = input \
comment = "accept established"

:if ($test == true) do={
:put "Test passed"
:if ($nested == 1) do={
:put "Nested OK"
}
} else={
:put "Test failed"
}

